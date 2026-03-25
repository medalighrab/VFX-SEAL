import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api/client";

// Debounce hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Cache for API responses
const cache = new Map();
const inFlightRequests = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const VENDOR_FILTERS_STORAGE_KEY = "vfxseal_vendors_active_filters";

const getSavedActiveFilters = () => {
  try {
    const raw = localStorage.getItem(VENDOR_FILTERS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      country: Array.isArray(parsed.country) ? parsed.country : [],
      size: Array.isArray(parsed.size) ? parsed.size : [],
      badge: Array.isArray(parsed.badge) ? parsed.badge : [],
      favoriteOnly: Boolean(parsed.favoriteOnly),
    };
  } catch {
    return null;
  }
};

const getCacheKey = (url, params) => {
  const searchParams = new URLSearchParams(params);
  return `${url}?${searchParams.toString()}`;
};

const isExpired = (timestamp) => {
  return Date.now() - timestamp > CACHE_DURATION;
};

// Enhanced vendors hook with caching and optimization
export const useVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [favoriteVendorIds, setFavoriteVendorIds] = useState([]);
  const [favoriteActionLoadingIds, setFavoriteActionLoadingIds] = useState([]);
  const [feedbackSummaries, setFeedbackSummaries] = useState({});
  const [filters, setFilters] = useState({
    countries: [],
    sizes: [],
    badges: [],
    services: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState(
    () =>
      getSavedActiveFilters() || {
        country: [],
        size: [],
        badge: [],
        favoriteOnly: false,
      },
  );
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized parameters for API calls
  const fetchParams = useMemo(
    () => ({
      eligibility: "strict-vendor-v2",
      search: debouncedSearchTerm,
      country: activeFilters.country.join(","),
      size: activeFilters.size.join(","),
      badge: activeFilters.badge.join(","),
      favoriteOnly: activeFilters.favoriteOnly ? "true" : "",
      page: pagination.page,
    }),
    [debouncedSearchTerm, activeFilters, pagination.page],
  );

  const fetchFavorites = useCallback(async () => {
    try {
      const { data } = await api.get("/favorites/vendors");
      setFavoriteVendorIds(
        Array.isArray(data?.favorites) ? data.favorites : [],
      );
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavoriteVendorIds([]);
    }
  }, []);

  // Fetch vendors with caching
  const fetchVendors = useCallback(
    async (params = fetchParams) => {
      setLoading(true);
      setError(null);

      const cacheKey = getCacheKey("/odoo/vendors", params);
      const cached = cache.get(cacheKey);

      if (cached && !isExpired(cached.timestamp)) {
        setVendors(cached.data.vendors);
        if (cached.data.filters) {
          setFilters(cached.data.filters);
        }
        setPagination({
          page: cached.data.page,
          totalPages: cached.data.totalPages,
          total: cached.data.total,
        });
        setLoading(false);
        return;
      }

      try {
        const cleanParams = Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value && value !== ""),
        );

        let requestPromise = inFlightRequests.get(cacheKey);
        if (!requestPromise) {
          requestPromise = api.get("/odoo/vendors", {
            params: cleanParams,
          });
          inFlightRequests.set(cacheKey, requestPromise);
        }

        const response = await requestPromise;
        const data = response.data;

        setVendors(data.vendors);
        if (data.filters) {
          setFilters(data.filters);
        }
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total,
        });

        // Cache the result
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
        setError(
          error?.response?.data?.message ||
            "Failed to load vendors from Odoo service",
        );
      } finally {
        inFlightRequests.delete(cacheKey);
        setLoading(false);
      }
    },
    [fetchParams],
  );

  // Fetch feedback summaries with vendor-specific caching
  const fetchFeedbackSummaries = useCallback(async (vendorIds) => {
    if (!vendorIds || vendorIds.length === 0) return;

    const cacheKey = `feedback-summaries-${vendorIds.sort().join(",")}`;
    const cached = cache.get(cacheKey);

    if (cached && !isExpired(cached.timestamp)) {
      setFeedbackSummaries((prev) => ({ ...prev, ...cached.data }));
      return;
    }

    try {
      const response = await api.get("/feedbacks/summaries", {
        params: { vendorIds: vendorIds.join(",") },
      });
      const summaries = response.data.summaries;

      setFeedbackSummaries((prev) => ({ ...prev, ...summaries }));

      // Cache the result
      cache.set(cacheKey, {
        data: summaries,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to fetch feedback summaries:", error);
    }
  }, []);

  // Fetch vendors when parameters change
  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    localStorage.setItem(
      VENDOR_FILTERS_STORAGE_KEY,
      JSON.stringify(activeFilters),
    );
  }, [activeFilters]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Fetch feedback summaries when vendors change
  useEffect(() => {
    if (vendors.length > 0) {
      const vendorIds = vendors.map((vendor) => vendor._id);
      fetchFeedbackSummaries(vendorIds);
    }
  }, [vendors, fetchFeedbackSummaries]);

  // Update search term
  const updateSearch = useCallback((term) => {
    setSearchTerm(term);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Update active filters
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  // Change page
  const changePage = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  // Clear cache (useful for data refresh)
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  const invalidateVendorCache = useCallback(() => {
    for (const key of cache.keys()) {
      if (key.startsWith("/odoo/vendors?")) {
        cache.delete(key);
      }
    }
  }, []);

  const toggleFavorite = useCallback(
    async (vendorId) => {
      if (!vendorId) return;

      if (favoriteActionLoadingIds.includes(vendorId)) return;

      setFavoriteActionLoadingIds((prev) => [...prev, vendorId]);

      const currentlyFavorite =
        favoriteVendorIds.includes(vendorId) ||
        (activeFilters.favoriteOnly &&
          vendors.some((vendor) => vendor._id === vendorId));
      const previousFavorites = favoriteVendorIds;
      const previousVendors = vendors;
      const previousPagination = pagination;
      const nextFavorites = currentlyFavorite
        ? previousFavorites.filter((id) => id !== vendorId)
        : [...previousFavorites, vendorId];

      setFavoriteVendorIds(nextFavorites);

      // Instant UX in "My List" mode: remove card immediately when unfavorited.
      if (activeFilters.favoriteOnly && currentlyFavorite) {
        setVendors((prev) => prev.filter((vendor) => vendor._id !== vendorId));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, (prev.total || 0) - 1),
        }));
      }

      try {
        if (currentlyFavorite) {
          await api.delete(
            `/favorites/vendors/${encodeURIComponent(vendorId)}`,
          );
        } else {
          await api.post(`/favorites/vendors/${encodeURIComponent(vendorId)}`);
        }

        invalidateVendorCache();

        // Don't refetch vendors list - the favorite state is already updated optimistically
        // and the vendor cards will re-render with the new favorite status.
        // Cache is invalidated for next real refetch from pagination/filter changes.
      } catch (error) {
        setFavoriteVendorIds(previousFavorites);
        setVendors(previousVendors);
        setPagination(previousPagination);
        throw error;
      } finally {
        setFavoriteActionLoadingIds((prev) =>
          prev.filter((id) => id !== vendorId),
        );
      }
    },
    [
      activeFilters.favoriteOnly,
      favoriteActionLoadingIds,
      favoriteVendorIds,
      invalidateVendorCache,
      pagination,
      vendors,
    ],
  );

  return {
    vendors,
    favoriteVendorIds,
    favoriteActionLoadingIds,
    feedbackSummaries,
    filters,
    loading,
    error,
    searchTerm,
    activeFilters,
    pagination,
    updateSearch,
    updateFilters,
    changePage,
    clearCache,
    toggleFavorite,
    refetchFavorites: fetchFavorites,
    refetch: () => fetchVendors(fetchParams),
  };
};
