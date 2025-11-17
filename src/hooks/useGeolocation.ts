'use client';

import { useState, useEffect } from 'react';

interface GeolocationCoordinates {
  lat: number;
  lng: number;
}

interface GeolocationState {
  coordinates: GeolocationCoordinates | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: true,
    error: null,
    hasPermission: false,
  });

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setState({
        coordinates: null,
        loading: false,
        error: 'Geolocation is not supported by your browser',
        hasPermission: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          loading: false,
          error: null,
          hasPermission: true,
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setState({
          coordinates: null,
          loading: false,
          error: errorMessage,
          hasPermission: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return {
    ...state,
    requestLocation,
  };
}
