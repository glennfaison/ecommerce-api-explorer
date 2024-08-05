const { fetchAllProductsInPriceRange } = require('.');

describe('fetchAllProductsInPriceRange', () => {
    const mockFetchProductsByPriceRange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should throw an error if minPrice is greater than maxPrice', async () => {
        await expect(fetchAllProductsInPriceRange({
            minPrice: 100,
            maxPrice: 50,
            fetchProductsByPriceRange: mockFetchProductsByPriceRange,
        })).rejects.toThrow('The minPrice must be less than or equal to the maxPrice.');
    });

    test('should return products if total is equal to count', async () => {
        mockFetchProductsByPriceRange.mockResolvedValue({
            total: 10,
            count: 10,
            products: [{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }],
        });

        const products = await fetchAllProductsInPriceRange({
            fetchProductsByPriceRange: mockFetchProductsByPriceRange,
        });

        expect(products).toEqual([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
    });

    test('should return an empty array if products field is not an array', async () => {
        mockFetchProductsByPriceRange.mockResolvedValue({
            total: 10,
            count: 10,
            products: null,
        });

        const products = await fetchAllProductsInPriceRange({
            fetchProductsByPriceRange: mockFetchProductsByPriceRange,
        });

        expect(products).toEqual([]);
    });

    test('should handle recursion when total is greater than count', async () => {
        mockFetchProductsByPriceRange.mockResolvedValueOnce({
            total: 10,
            count: 5,
            products: [{ id: 1, name: 'Product 1' }],
        });
        mockFetchProductsByPriceRange.mockResolvedValueOnce({
            total: 5,
            count: 5,
            products: [{ id: 1, name: 'Product 1' }],
        });
        mockFetchProductsByPriceRange.mockResolvedValueOnce({
            total: 5,
            count: 5,
            products: [{ id: 2, name: 'Product 2' }],
        });

        const products = await fetchAllProductsInPriceRange({
            minPrice: 0,
            maxPrice: 100,
            fetchProductsByPriceRange: mockFetchProductsByPriceRange,
        });

        expect(products).toEqual([{ id: 1, name: 'Product 1' }, { id: 2, name: 'Product 2' }]);
        expect(mockFetchProductsByPriceRange).toHaveBeenCalledTimes(3); // Ensure it was called thrice after recursion
    });

    test('should throw an error if total is less than count', async () => {
        mockFetchProductsByPriceRange.mockResolvedValue({
            total: 5,
            count: 10,
            products: [{ id: 1, name: 'Product 1' }],
        });

        await expect(fetchAllProductsInPriceRange({
            fetchProductsByPriceRange: mockFetchProductsByPriceRange,
        })).rejects.toThrow('The API returned more products than expected. `count` should be less than or equal to `total`.');
    });

    test('should ensure that the length of returned products is equal to total', async () => {
        async function testOnce() {
            // Random integer between 1000 and 1,000,000 inclusive.
            const ServerTotal = Math.floor(Math.random() * (1_000_000 - 1_000 + 1)) + 1_000;
            const ServerMinPrice = 1;
            const ServerMaxPrice = 100_000;
            const ServerProducts = new Array(ServerTotal).fill(null).map((_, i) => ({
                id: i + 1,
                name: `Product ${i + 1}`,
                price: Math.floor(Math.random() * (ServerMaxPrice - ServerMinPrice + 1)) + ServerMinPrice
            }));

            mockFetchProductsByPriceRange.mockImplementation((minPrice, maxPrice) => {
                const productsFound = ServerProducts.filter(product => product.price >= minPrice && product.price <= maxPrice);
                const productsToReturn = productsFound.slice(0, 1000);
                return new Promise(resolve => resolve({
                    total: productsFound.length,
                    count: productsToReturn.length,
                    products: productsToReturn,
                }));
            });

            const products = await fetchAllProductsInPriceRange({
                fetchProductsByPriceRange: mockFetchProductsByPriceRange,
            });

            expect(products).toHaveLength(ServerTotal);
            mockFetchProductsByPriceRange.mockClear();
        }

        for (let i = 0; i < 10; i++) {
            await testOnce();
        }
    });
});
