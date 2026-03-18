import { useState, useEffect } from 'react';
import { getLinks } from '../api/links';

/**
 * Custom hook for managing links data
 * Handles fetching, loading, and error states
 * @returns {Object} { links, loading, error, refetch }
 */
export const useLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLinks();
      setLinks(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch links');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch links when component mounts
  useEffect(() => {
    fetchLinks();
  }, []);

  return {
    links,
    loading,
    error,
    refetch: fetchLinks, // Function to manually refresh the list
  };
};
