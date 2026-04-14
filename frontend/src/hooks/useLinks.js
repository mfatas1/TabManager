import { useState, useEffect } from 'react';
import { getLinks } from '../api/links';

export const useLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLinks = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await getLinks();
      setLinks(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch links');
      if (!silent) setLinks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  return {
    links,
    loading,
    error,
    refetch: fetchLinks,
    silentRefetch: () => fetchLinks(true),
  };
};
