import React from "react";

const VendorCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      {/* Logo and Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
        <div className="w-16 h-6 bg-gray-300 rounded-full"></div>
      </div>

      {/* Title */}
      <div className="h-6 bg-gray-300 rounded mb-2 w-3/4"></div>

      {/* Location and Size */}
      <div className="flex items-center gap-4 mb-3">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
      </div>

      {/* Services */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded-full w-14"></div>
      </div>

      {/* Rating and View Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-gray-200 rounded-sm"></div>
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="h-10 bg-gray-300 rounded-lg w-20"></div>
      </div>
    </div>
  );
};

const VendorGridSkeleton = ({ count = 9 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, index) => (
        <VendorCardSkeleton key={index} />
      ))}
    </div>
  );
};

const VendorFilterSkeleton = () => {
  return (
    <div className="w-full lg:w-80 bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-6 bg-gray-300 rounded mb-6 w-24"></div>

      {/* Search */}
      <div className="mb-6">
        <div className="h-4 bg-gray-200 rounded mb-2 w-16"></div>
        <div className="h-10 bg-gray-100 rounded-lg w-full"></div>
      </div>

      {/* Filter sections */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="mb-6">
          <div className="h-4 bg-gray-200 rounded mb-3 w-20"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export { VendorCardSkeleton, VendorGridSkeleton, VendorFilterSkeleton };
