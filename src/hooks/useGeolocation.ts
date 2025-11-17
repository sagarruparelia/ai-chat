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
  source: 'browser' | 'ip' | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: true,
    error: null,
    hasPermission: false,
    source: null,
  });

  // Fallback to IP-based geolocation
  const getLocationFromIP = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Using ipapi.co free tier (no API key required, 1000 requests/day)
      const response = await fetch('https://ipapi.co/json/');

      if (!response.ok) {
        throw new Error('IP geolocation service unavailable');
      }

      const data = await response.json();

      if (data.latitude && data.longitude) {
        setState({
          coordinates: {
            lat: data.latitude,
            lng: data.longitude,
          },
          loading: false,
          error: null,
          hasPermission: false, // Not browser permission, but location obtained
          source: 'ip',
        });
      } else {
        throw new Error('Invalid IP geolocation data');
      }
    } catch (err) {
      setState({
        coordinates: null,
        loading: false,
        error: 'Failed to get location from IP. Please enable browser location.',
        hasPermission: false,
        source: null,
      });
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      // Browser doesn't support geolocation, fall back to IP
      console.log('Geolocation not supported, using IP location');
      getLocationFromIP();
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
          source: 'browser',
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Browser location denied, using approximate location';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Browser location unavailable, using approximate location';
            break;
          case error.TIMEOUT:
            errorMessage = 'Browser location timed out, using approximate location';
            break;
        }

        console.log(`${errorMessage}, falling back to IP location`);
        // Fall back to IP geolocation
        getLocationFromIP();
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
