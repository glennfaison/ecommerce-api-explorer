/**
 * @typedef {object} Product
 * 
 * @typedef {object} ApiResponse
 * @property {number} total - Total number of products available in the API.
 * @property {number} count - Number of products fetched in the current call.
 * @property {Product[]} products - Array of products fetched in the current call.
 * 
 * @typedef {object} Settings
 * @property {number} minPrice - Minimum price of the products to fetch.
 * @property {number} maxPrice - Maximum price of the products to fetch.
 * @property {number} minStepValue - Minimum value to increment a price by.
 * @property {(product: Product) => string} getUniqueId - Function to uniquely identify a product.
 * @property {(minPrice: number, maxPrice: number) => Promise<ApiResponse>} fetchProductsByPriceRange - Function to fetch products from the API in a given price range.
 */

/**
 * Fetches products from the API in a given price range.
 * Assumption: There won't be more than 1000 products with the exact same price. If there were, we don't have the API to fetch them anyway.
 * 
 * @param {Settings} settings
 * @returns {Promise<Product[]>}
 * 
 * @example
 * ```javascript
 * // Using the default settings.
 * const products = await fetchAllProductsInPriceRange({
 *     fetchProductsByPriceRange: async (minPrice, maxPrice) => {...}
 * });
 * ```
 * 
 * @example
 * ```javascript
 * // Setting the values explicitly.
 * const products = await fetchAllProductsInPriceRange({
 *     minPrice: 0,
 *     maxPrice: 100_000,
 *     minStepValue: 1,
 *     getUniqueId: (product) => product.id,
 *     fetchProductsByPriceRange: async (minPrice, maxPrice) => {...}
 * });
 * ```
 */
async function fetchAllProductsInPriceRange(settings) {
    // Set defaults.
    const {
        minPrice = 0,
        maxPrice = 100_000,
        minStepValue = 1,
        getUniqueId = (product) => product.id,
        fetchProductsByPriceRange,
    } = settings;

    if (minPrice > maxPrice) {
        throw new Error('The minPrice must be less than or equal to the maxPrice.');
    }

    const /** @type {Map<string, Product>} */ productMap = new Map();
    const response = await fetchProductsByPriceRange(minPrice, maxPrice);
    let /** @type {Product[]} */ products = [];

    if (response.total === response.count) {
        if  (!Array.isArray(response.products)) {
            return [];
        }
        products = response.products;
    } else if (response.total > response.count) {
        // If total > count, then we need to fetch more products with a divide-and-conquer approach.
        // Assumption: as long as total > count, then total must be greater than the max page size of 1000 (the value doesn't matter).
        const /** @type {number} */ nextPriceLimit = minPrice + Math.floor((maxPrice - minPrice) / 2);

        // Make sure we don't include prices that we already got products for.
        const firstHalfOfResponse = await fetchAllProductsInPriceRange({ ...settings, maxPrice: nextPriceLimit });
        const secondHalfOfResponse = await fetchAllProductsInPriceRange({ ...settings, minPrice: nextPriceLimit + minStepValue });

        products = products.concat(firstHalfOfResponse);
        products = products.concat(secondHalfOfResponse);
    } else {
        // If are here, then (total < count), and there is likely a problem on the server side.
        throw new Error('The API returned more products than expected. `count` should be less than or equal to `total`.');
    }

    for (const product of products) {
        if (productMap.has(getUniqueId(product))) {
            continue;
        }
        productMap.set(getUniqueId(product), product);
    }

    return Array.from(productMap.values());
}

module.exports = { fetchAllProductsInPriceRange };