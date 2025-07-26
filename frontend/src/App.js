import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const GOOGLE_MAPS_API_KEY = "AIzaSyBiIgW9Lyzsu1SvLK0cfI1yPFahXHCOwDk"; // Replace with your actual API key
const API_BASE_URL = "http://localhost:5000/api";

function DoctorForm({ onDoctorAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    phone: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    // Load Google Maps
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      const mapInstance = new window.google.maps.Map(
        document.getElementById("doctor-map"),
        {
          center: { lat: 12.9716, lng: 77.5946 }, // Bangalore coordinates
          zoom: 11,
        }
      );

      setMap(mapInstance);

      // Add click listener to map
      mapInstance.addListener("click", (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // Remove existing marker
        if (marker) {
          marker.setMap(null);
        }

        // Add new marker
        const newMarker = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance,
          title: "Clinic Location",
        });

        setMarker(newMarker);

        // Update form data
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
        }));

        // Reverse geocoding to get address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results[0]) {
            setFormData((prev) => ({
              ...prev,
              address: results[0].formatted_address,
            }));
          }
        });
      });
    };

    loadGoogleMaps();
  }, [marker]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      alert("Please select a location on the map");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/doctors`, {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      });

      if (response.data.success) {
        alert("Doctor added successfully!");
        setFormData({
          name: "",
          specialization: "",
          phone: "",
          address: "",
          latitude: "",
          longitude: "",
        });

        // Clear marker
        if (marker) {
          marker.setMap(null);
          setMarker(null);
        }

        onDoctorAdded();
      }
    } catch (error) {
      alert("Error adding doctor: " + error.message);
    }
  };

  return (
    <div className="doctor-form">
      <h2>Add Doctor (Clinic Location)</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Doctor Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Specialization"
          value={formData.specialization}
          onChange={(e) =>
            setFormData({ ...formData, specialization: e.target.value })
          }
          required
        />
        <input
          type="text"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        <textarea
          placeholder="Address (will be auto-filled when you click on map)"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          required
        />
        <div className="coordinates">
          <input
            type="text"
            placeholder="Latitude"
            value={formData.latitude}
            readOnly
          />
          <input
            type="text"
            placeholder="Longitude"
            value={formData.longitude}
            readOnly
          />
        </div>
        <button type="submit">Add Doctor</button>
      </form>

      <div className="map-container">
        <p>Click on the map to select clinic location:</p>
        <div id="doctor-map" style={{ height: "400px", width: "100%" }}></div>
      </div>
    </div>
  );
}

function PatientSearch() {
  const [searchLocation, setSearchLocation] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    // Load Google Maps for patient search
    const loadGoogleMaps = () => {
      if (window.google) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      const mapInstance = new window.google.maps.Map(
        document.getElementById("patient-map"),
        {
          center: { lat: 12.9716, lng: 77.5946 }, // Bangalore coordinates
          zoom: 11,
        }
      );

      setMap(mapInstance);
    };

    loadGoogleMaps();
  }, []);

  const clearMarkers = () => {
    markers.forEach((marker) => marker.setMap(null));
    setMarkers([]);
  };

  const searchByLocation = async () => {
    if (!searchLocation.trim()) {
      alert("Please enter a location to search");
      return;
    }

    setLoading(true);
    setNearbyResults([]); // Clear nearby results

    try {
      console.log("Searching for location:", searchLocation);
      const response = await axios.get(
        `${API_BASE_URL}/doctors/location/${encodeURIComponent(searchLocation)}`
      );

      console.log("Search response:", response.data);

      if (response.data.success) {
        setSearchResults(response.data.doctors);

        if (response.data.doctors.length === 0) {
          alert(
            `No doctors found in "${searchLocation}". Try searching for a different location like "Koramangala", "JP Nagar", etc.`
          );
        } else {
          displayDoctorsOnMap(response.data.doctors);
        }
      } else {
        alert("Error: " + response.data.error);
      }
    } catch (error) {
      console.error("Search error:", error);
      alert(
        "Error searching doctors: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const findNearbyDoctors = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);
    setSearchResults([]); // Clear search results

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log("User location:", lat, lng);
        setUserLocation({ lat, lng });

        try {
          const response = await axios.get(`${API_BASE_URL}/doctors/search`, {
            params: {
              lat: lat.toString(),
              lng: lng.toString(),
              maxDistance: 10000, // 10km radius
            },
          });

          console.log("Nearby search response:", response.data);

          if (response.data.success) {
            setNearbyResults(response.data.doctors);

            if (response.data.doctors.length === 0) {
              alert(
                "No doctors found within 10km of your location. Try increasing the search radius or add some doctors first."
              );
            } else {
              displayDoctorsOnMap(response.data.doctors, { lat, lng });
            }
          } else {
            alert("Error: " + response.data.error);
          }
        } catch (error) {
          console.error("Nearby search error:", error);
          alert(
            "Error finding nearby doctors: " +
              (error.response?.data?.error || error.message)
          );
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        let errorMessage = "Error getting your location: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied by user.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const displayDoctorsOnMap = (doctors, userLoc = null) => {
    if (!map || !window.google) {
      console.log("Map not ready yet");
      return;
    }

    console.log("Displaying doctors on map:", doctors.length);

    // Clear existing markers
    clearMarkers();

    const bounds = new window.google.maps.LatLngBounds();
    const newMarkers = [];

    // Add user location marker if available
    if (userLoc) {
      const userMarker = new window.google.maps.Marker({
        position: userLoc,
        map: map,
        title: "Your Location",
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        },
      });
      newMarkers.push(userMarker);
      bounds.extend(userLoc);
    }

    // Add doctor markers
    doctors.forEach((doctor, index) => {
      const position = {
        lat: doctor.location.coordinates[1], // latitude
        lng: doctor.location.coordinates[0], // longitude
      };

      console.log(`Doctor ${index + 1} position:`, position);

      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: doctor.name,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${doctor.name}</h3>
            <p style="margin: 5px 0;"><strong>Specialization:</strong> ${doctor.specialization}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${doctor.phone}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${doctor.address}</p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (doctors.length > 0 || userLoc) {
      map.fitBounds(bounds);

      // If only one point, zoom out a bit
      if (
        (doctors.length === 1 && !userLoc) ||
        (doctors.length === 0 && userLoc)
      ) {
        setTimeout(() => {
          if (map.getZoom() > 15) {
            map.setZoom(15);
          }
        }, 100);
      }
    }
  };

  // Handle Enter key press in search input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      searchByLocation();
    }
  };

  return (
    <div className="patient-search">
      <h2>Find Doctors (Patient View)</h2>

      <div className="search-controls">
        <div className="location-search">
          <input
            type="text"
            placeholder="Enter location (e.g., JP Nagar, Koramangala, Whitefield)"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            onClick={searchByLocation}
            disabled={loading || !searchLocation.trim()}
          >
            {loading ? "Searching..." : "Search by Location"}
          </button>
        </div>

        <button
          onClick={findNearbyDoctors}
          className="nearby-btn"
          disabled={loading}
        >
          {loading ? "Finding..." : "Find Nearby Doctors (Use My Location)"}
        </button>
      </div>

      <div className="map-container">
        <div id="patient-map" style={{ height: "400px", width: "100%" }}></div>
      </div>

      <div className="results">
        {loading && (
          <div className="loading">
            <p>Searching for doctors...</p>
          </div>
        )}

        {searchResults.length > 0 && !loading && (
          <div className="search-results">
            <h3>
              Search Results for "{searchLocation}" ({searchResults.length}{" "}
              found):
            </h3>
            {searchResults.map((doctor) => (
              <div key={doctor._id} className="doctor-card">
                <h4>{doctor.name}</h4>
                <p>
                  <strong>Specialization:</strong> {doctor.specialization}
                </p>
                <p>
                  <strong>Phone:</strong> {doctor.phone}
                </p>
                <p>
                  <strong>Address:</strong> {doctor.address}
                </p>
                <p>
                  <strong>Coordinates:</strong>{" "}
                  {doctor.location.coordinates[1].toFixed(6)},{" "}
                  {doctor.location.coordinates[0].toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {nearbyResults.length > 0 && !loading && (
          <div className="nearby-results">
            <h3>Nearby Doctors ({nearbyResults.length} found within 10km):</h3>
            {nearbyResults.map((doctor) => (
              <div key={doctor._id} className="doctor-card">
                <h4>{doctor.name}</h4>
                <p>
                  <strong>Specialization:</strong> {doctor.specialization}
                </p>
                <p>
                  <strong>Phone:</strong> {doctor.phone}
                </p>
                <p>
                  <strong>Address:</strong> {doctor.address}
                </p>
                <p>
                  <strong>Coordinates:</strong>{" "}
                  {doctor.location.coordinates[1].toFixed(6)},{" "}
                  {doctor.location.coordinates[0].toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {!loading &&
          searchResults.length === 0 &&
          nearbyResults.length === 0 &&
          (searchLocation || userLocation) && (
            <div className="no-results">
              <p>No doctors found. Try:</p>
              <ul>
                <li>Adding some doctors first using the "Doctor View" tab</li>
                <li>Searching for a different location</li>
                <li>
                  Using broader location names (e.g., "Bangalore" instead of
                  specific street names)
                </li>
              </ul>
            </div>
          )}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("doctor");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDoctorAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Doctor-Patient Platform</h1>
        <nav>
          <button
            className={activeTab === "doctor" ? "active" : ""}
            onClick={() => setActiveTab("doctor")}
          >
            Doctor View
          </button>
          <button
            className={activeTab === "patient" ? "active" : ""}
            onClick={() => setActiveTab("patient")}
          >
            Patient View
          </button>
        </nav>
      </header>

      <main>
        {activeTab === "doctor" ? (
          <DoctorForm onDoctorAdded={handleDoctorAdded} />
        ) : (
          <PatientSearch key={refreshKey} />
        )}
      </main>
    </div>
  );
}

export default App;
