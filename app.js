document.addEventListener('DOMContentLoaded', function () {
    // Modal elements
    const categoryModal = document.getElementById('categoryModal');
    const productModal = document.getElementById('productModal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const addProductBtn = document.getElementById('addProductBtn');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    const cancelButtons = document.querySelectorAll('.btn-cancel');
    const orderHistoryBtn = document.getElementById('orderHistoryBtn');
    const orderHistoryModal = document.getElementById('orderHistoryModal');

    // Menu elements
    const menuBtn = document.querySelector('.menu-btn');
    const menuDropdown = document.querySelector('.menu-dropdown');

    // Forms
    const categoryForm = document.getElementById('categoryForm');
    const productForm = document.getElementById('productForm');
    const categoriesNav = document.querySelector('.categories');
    const productsGrid = document.querySelector('.products-grid');

    // Initialize data from localStorage or set defaults
    let categories = JSON.parse(localStorage.getItem('categories')) || [
        { name: 'All Items', color: '#6B46C1', id: 'all' },
    ];

    let products = JSON.parse(localStorage.getItem('products')) || [];

    // Default settings
    const defaultSettings = {
        taxRate: 0,
        currencyPosition: 'prefix',
        itemsPerPage: 24,
        enableTables: true,
        maxTables: 20,
        storeName: 'WarkoPOS',
        storeAddress: '',
        receiptFooter: 'Thank you for your purchase!',
        lowStockThreshold: 5
    };

    // Load settings from localStorage or use defaults
    let settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;

    // Track editing order - update to use localStorage
    let editingOrderId = localStorage.getItem('editingOrderId') || null;

    // Cart initialization with settings-based tax rate
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItems = document.querySelector('.cart-items');
    let TAX_RATE = settings.taxRate / 100;

    // Add orders to localStorage
    let orders = JSON.parse(localStorage.getItem('orders')) || [];
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutForm = document.getElementById('checkoutForm');

    // Tambahkan di bagian awal, setelah inisialisasi products
    let productLogs = JSON.parse(localStorage.getItem('productLogs')) || {};

    // Settings button click handler
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');

    settingsBtn.addEventListener('click', () => {
        fillSettingsForm();
        openModal(settingsModal);
        setupNumberInputs();
    });

    function fillSettingsForm() {
        // Fill form with current settings
        Object.keys(settings).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = settings[key];
                } else {
                    input.value = settings[key];
                }
            }
        });

        // Toggle table settings visibility
        document.querySelector('.table-settings').style.display =
            settings.enableTables ? 'block' : 'none';
    }

    // Handle table management toggle
    document.getElementById('enableTables').addEventListener('change', function (e) {
        document.querySelector('.table-settings').style.display =
            e.target.checked ? 'block' : 'none';
    });

    // Handle settings form submission
    settingsForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Update settings object
        settings = {
            taxRate: parseFloat(document.getElementById('taxRate').value),
            currencyPosition: document.getElementById('currencyPosition').value,
            itemsPerPage: parseInt(document.getElementById('itemsPerPage').value),
            enableTables: document.getElementById('enableTables').checked,
            maxTables: parseInt(document.getElementById('maxTables').value),
            storeName: document.getElementById('storeName').value,
            storeAddress: document.getElementById('storeAddress').value,
            receiptFooter: document.getElementById('receiptFooter').value,
            lowStockThreshold: parseInt(document.getElementById('lowStockThreshold').value)
        };

        // Save settings
        localStorage.setItem('settings', JSON.stringify(settings));

        // Apply settings
        applySettings();

        // Close modal and show confirmation
        closeModal(settingsModal);
        showAlert('Settings saved successfully', 'success');
    });

    // Export data handler
    document.getElementById('exportData').addEventListener('click', function () {
        const exportData = {
            settings,
            categories,
            products,
            orders,
            productLogs
        };

        const dataStr = JSON.stringify(exportData);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `pos_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    // Function to apply settings
    function applySettings() {
        // Update tax rate
        TAX_RATE = settings.taxRate / 100;

        // Re-render cart to update currency display
        renderCart();

        // Re-render products with new items per page setting
        const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
            .map(btn => btn.dataset.categoryId);
        renderProducts(selectedCategories);
    }

    // Apply settings on initial load
    applySettings();

    // Function to save data to localStorage
    function saveToStorage() {
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('products', JSON.stringify(products));
    }

    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Custom Alert Function
    function showAlert(message, type = 'info') {
        const alertContainer = document.querySelector('.alert-container');
        const alert = alertContainer.querySelector('.alert');
        const alertMessage = alert.querySelector('.alert-message');

        // Remove existing classes
        alert.classList.remove('error', 'success', 'warning');

        // Add new class based on type
        if (type !== 'info') {
            alert.classList.add(type);
        }

        // Update message
        alertMessage.textContent = message;

        // Show alert
        alert.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            alert.classList.remove('show');
        }, 3000);
    }

    function addToCart(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Check stock if enabled
        if (product.stockManagement && product.stock !== 'unlimited') {
            const currentStock = parseInt(product.stock);
            const cartItem = cart.find(item => item.productId === productId);
            const cartQuantity = cartItem ? cartItem.quantity : 0;

            if (currentStock <= cartQuantity) {
                showAlert('Sorry, not enough stock available.', 'error');
                return;
            }
        }

        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                productId,
                name: product.name,
                price: parseFloat(product.price),
                quantity: 1
            });
        }

        saveCart();
        renderCart();
        showAlert('Item added to cart', 'success');
    }

    function updateCartQuantity(productId, newQuantity) {
        const product = products.find(p => p.id === productId);

        // Check stock if trying to increase quantity
        if (product && product.stockManagement && product.stock !== 'unlimited' && newQuantity > 0) {
            const currentStock = parseInt(product.stock);
            if (newQuantity > currentStock) {
                showAlert('Sorry, not enough stock available.', 'error');
                return;
            }
        }

        if (newQuantity < 1) {
            cart = cart.filter(item => item.productId !== productId);
            showAlert('Item removed from cart', 'warning');
        } else {
            const item = cart.find(item => item.productId === productId);
            if (item) {
                item.quantity = newQuantity;
            }
        }

        saveCart();
        renderCart();
    }

    // Update calculateCartTotals untuk menggunakan dynamic tax rate
    function calculateCartTotals(order = null) {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Gunakan tax rate dari order jika ada dan paid, atau dari settings
        const taxRate = (order && order.paymentStatus === 'paid' && order.taxRateAtOrder !== null)
            ? order.taxRateAtOrder / 100
            : settings.taxRate / 100;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }

    // Add this function to handle checkout button text
    function updateCheckoutButtonText() {
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (editingOrderId) {
            checkoutBtn.textContent = `Update Order #${editingOrderId}`;
        } else {
            checkoutBtn.textContent = 'Checkout';
        }
    }

    // Update renderCart to add cancel button
    function renderCart() {
        cartItems.innerHTML = '';

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                </div>
            `;
        } else {
            if (editingOrderId) {
                cartItems.insertAdjacentHTML('afterbegin', `
                    <div class="editing-order-info">
                        <div class="edit-status">
                            <span>Editing Order #${editingOrderId}</span>
                        </div>
                        <button class="cancel-edit-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Cancel Edit
                        </button>
                    </div>
                `);
            }

            cart.forEach(item => {
                const cartItem = document.createElement('div');
                cartItem.className = 'cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>Rp ${item.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn minus" data-id="${item.productId}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.productId}">+</button>
                        <button class="remove-btn" data-id="${item.productId}">&times;</button>
                    </div>
                    <div class="cart-item-total">
                        Rp ${(item.price * item.quantity).toLocaleString('id-ID')}
                    </div>
                `;
                cartItems.appendChild(cartItem);
            });
        }

        // Update summary with tooltip for tax rate
        const { subtotal, tax, total } = calculateCartTotals();
        document.querySelector('.subtotal').innerHTML = `
            <span>Subtotal</span>
            <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
        `;
        document.querySelector('.tax').innerHTML = `
            <span>
                PPN (${settings.taxRate}%)
                <span class="tax-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span class="tooltip">Tax rate can be adjusted in Settings</span>
                </span>
            </span>
            <span>Rp ${tax.toLocaleString('id-ID')}</span>
        `;
        document.querySelector('.total').innerHTML = `
            <span>Total</span>
            <span>Rp ${total.toLocaleString('id-ID')}</span>
        `;

        // Update product buttons status after cart changes
        updateProductButtonsStatus();

        // Add this at the end of renderCart function
        updateCheckoutButtonText();
    }

    function getStockStatus(stock, productId) {
        // Check if item is in cart
        const cartItem = cart.find(item => item.productId === productId);
        const cartQuantity = cartItem ? cartItem.quantity : 0;

        if (stock === 'unlimited') {
            return {
                text: 'In Stock',
                class: 'stock-good',
                disabled: ''
            };
        }

        const stockNum = parseInt(stock);
        if (stockNum <= 0) {
            return {
                text: 'Out of Stock',
                class: 'stock-warning',
                disabled: 'disabled'
            };
        }

        // If item in cart has reached stock limit
        if (cartQuantity >= stockNum) {
            return {
                text: `Max Stock Reached (${stockNum})`,
                class: 'stock-warning',
                disabled: 'disabled'
            };
        }

        if (stockNum <= 5) {
            return {
                text: `Low Stock (${stockNum - cartQuantity} left)`,
                class: 'stock-low',
                disabled: ''
            };
        }

        return {
            text: `In Stock (${stockNum - cartQuantity})`,
            class: 'stock-good',
            disabled: ''
        };
    }

    function renderProducts(selectedCategories = ['all'], searchResults = null) {
        productsGrid.innerHTML = '';
        let filtered = searchResults;

        if (!searchResults) {
            filtered = selectedCategories.includes('all')
                ? products
                : products.filter(p => selectedCategories.includes(p.categoryId));
        }

        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-results">
                    <p>No products found</p>
                </div>
            `;
            return;
        }

        filtered.forEach(product => {
            const stockStatus = getStockStatus(product.stock, product.id);
            const category = categories.find(c => c.id === product.categoryId);
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img" style="background-image: url(${product.image || ''})"></div>
                <span class="category-label" style="background-color: ${category?.color || '#CBD5E0'}">${category?.name || 'Uncategorized'}</span>
                <h3>${product.name}</h3>
                <p>Rp ${parseInt(product.price).toLocaleString('id-ID')}</p>
                <div class="product-stock ${stockStatus.class}">${stockStatus.text}</div>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${product.id}" ${stockStatus.disabled}>
                        ${stockStatus.disabled ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button class="product-menu-btn" title="More options">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="product-menu">
                        <div class="product-menu-item" data-action="edit">Edit</div>
                        <div class="product-menu-item" data-action="history">History</div>
                        <div class="product-menu-item" data-action="delete">Delete</div>
                    </div>
                </div>
            `;
            productsGrid.appendChild(card);
        });
    }

    // Update function to render categories with multiple selection support
    function renderCategories() {
        categoriesNav.innerHTML = '';

        // Sort categories alphabetically, but keep "All Items" at the top
        const sortedCategories = [...categories].sort((a, b) => {
            if (a.id === 'all') return -1;
            if (b.id === 'all') return 1;
            return a.name.localeCompare(b.name);
        });

        sortedCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            if (category.id === 'all') btn.classList.add('all-items', 'selected');
            btn.textContent = category.name;
            btn.dataset.categoryId = category.id;
            btn.dataset.color = category.color; // Tambah data color

            if (category.id !== 'all') {
                const dot = document.createElement('span');
                dot.className = 'category-dot';
                dot.style.backgroundColor = category.color;
                btn.prepend(dot);
            }

            // Set style untuk button yang selected
            if (btn.classList.contains('selected')) {
                btn.style.backgroundColor = category.color;
                btn.style.borderColor = category.color;
                btn.style.color = 'white';
            }

            categoriesNav.appendChild(btn);
        });
    }

    // Update category click handler for multiple selection
    categoriesNav.addEventListener('click', (e) => {
        const clickedCategory = e.target.closest('.category-btn');
        if (!clickedCategory) return; // Exit if not clicking a category button

        const isAllItems = clickedCategory.classList.contains('all-items');
        const categoryColor = clickedCategory.dataset.color;
        const allItemsBtn = document.querySelector('.category-btn.all-items');

        if (!allItemsBtn) {
            console.error('All Items category button not found');
            return;
        }

        if (isAllItems) {
            // If click "All Items", deselect other categories
            document.querySelectorAll('.category-btn').forEach(btn => {
                if (btn) {
                    btn.classList.remove('selected');
                    btn.style.backgroundColor = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }
            });
            clickedCategory.classList.add('selected');
            clickedCategory.style.backgroundColor = categoryColor;
            clickedCategory.style.borderColor = categoryColor;
            clickedCategory.style.color = 'white';
        } else {
            // Remove selection from "All Items"
            allItemsBtn.classList.remove('selected');
            allItemsBtn.style.backgroundColor = '';
            allItemsBtn.style.borderColor = '';
            allItemsBtn.style.color = '';

            // Toggle selection for clicked category
            clickedCategory.classList.toggle('selected');

            if (clickedCategory.classList.contains('selected')) {
                clickedCategory.style.backgroundColor = categoryColor;
                clickedCategory.style.borderColor = categoryColor;
                clickedCategory.style.color = 'white';
            } else {
                clickedCategory.style.backgroundColor = '';
                clickedCategory.style.borderColor = '';
                clickedCategory.style.color = '';
            }

            // Check if any category is selected
            const selectedCategories = [...document.querySelectorAll('.category-btn.selected:not(.all-items)')]
                .map(btn => btn.dataset.categoryId);

            // If no category selected, activate "All Items"
            if (selectedCategories.length === 0) {
                allItemsBtn.classList.add('selected');
                allItemsBtn.style.backgroundColor = allItemsBtn.dataset.color;
                allItemsBtn.style.borderColor = allItemsBtn.dataset.color;
                allItemsBtn.style.color = 'white';
            }
        }

        // Get all selected categories and render products
        const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
            .map(btn => btn.dataset.categoryId);
        renderProducts(selectedCategories);
    });

    // Update category form with auto-slug generation
    document.getElementById('categoryName').addEventListener('input', function (e) {
        const slug = e.target.value.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        document.getElementById('categorySlug').value = slug;
    });

    // Update color preview
    document.getElementById('categoryColor').addEventListener('input', function (e) {
        document.querySelector('.color-preview-code').textContent = e.target.value.toUpperCase();
    });

    // Update category form submission
    categoryForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const newCategory = {
            id: document.getElementById('categorySlug').value,
            name: document.getElementById('categoryName').value,
            color: document.getElementById('categoryColor').value,
            description: document.getElementById('categoryDescription').value,
            notes: document.getElementById('categoryNotes').value,
            createdAt: new Date().toISOString()
        };

        categories.push(newCategory);
        saveToStorage();
        renderCategories();

        categoryForm.reset();
        closeModal(categoryModal);
    });

    // Add stock toggle handler
    document.getElementById('enableStock').addEventListener('change', function (e) {
        const stockInputGroup = document.getElementById('stockInputGroup');
        stockInputGroup.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
            document.getElementById('productStock').value = '';
        }
    });

    // Add function to fill product form for editing
    function fillProductForm(product) {
        const form = document.getElementById('productForm');
        const modalTitle = productModal.querySelector('.modal-header h3');
        const submitBtn = productModal.querySelector('.btn-save');

        // Update modal title and button
        modalTitle.textContent = 'Edit Product';
        submitBtn.textContent = 'Update Product';

        // Reset form terlebih dahulu
        form.reset();

        // Set form data
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productCategory').value = product.categoryId || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('internalNotes').value = product.internalNotes || '';

        // Handle stock management
        const enableStock = document.getElementById('enableStock');
        const stockInputGroup = document.getElementById('stockInputGroup');

        enableStock.checked = product.stockManagement || false;
        stockInputGroup.style.display = product.stockManagement ? 'block' : 'none';

        if (product.stockManagement) {
            document.getElementById('productStock').value =
                product.stock === 'unlimited' ? '' : (product.stock || '');
        }

        // Set form mode
        form.dataset.mode = 'edit';
        form.dataset.editId = product.id;

        // Reset image preview first
        const uploadWrapper = document.querySelector('.image-upload-wrapper');
        uploadWrapper.style.backgroundImage = '';
        uploadWrapper.querySelector('svg').style.display = 'block';
        uploadWrapper.querySelector('.image-upload-text').style.display = 'block';
        uploadWrapper.querySelector('.image-upload-hint').style.display = 'block';

        // Show image preview if exists
        if (product.image) {
            uploadWrapper.style.backgroundImage = `url(${product.image})`;
            uploadWrapper.style.backgroundSize = 'cover';
            uploadWrapper.style.backgroundPosition = 'center';
            uploadWrapper.querySelector('svg').style.display = 'none';
            uploadWrapper.querySelector('.image-upload-text').style.display = 'none';
            uploadWrapper.querySelector('.image-upload-hint').style.display = 'none';
        }

        // Ensure category options are loaded
        updateProductCategoryOptions();
        setTimeout(() => {
            document.getElementById('productCategory').value = product.categoryId || '';
        }, 100);
    }

    // Tambahkan fungsi untuk mencatat log
    function addProductLog(productId, action, details) {
        if (!productLogs[productId]) {
            productLogs[productId] = [];
        }

        productLogs[productId].push({
            action,
            details,
            timestamp: new Date().toISOString()
        });

        localStorage.setItem('productLogs', JSON.stringify(productLogs));
    }

    // Update product form submission with stock
    productForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const enableStock = document.getElementById('enableStock').checked;
        const stockValue = document.getElementById('productStock').value;

        const formData = {
            name: document.getElementById('productName').value,
            price: document.getElementById('productPrice').value,
            categoryId: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value,
            internalNotes: document.getElementById('internalNotes').value,
            stockManagement: document.getElementById('enableStock').checked,
            stock: document.getElementById('enableStock').checked
                ? (document.getElementById('productStock').value || 'unlimited')
                : 'unlimited'
        };

        if (this.dataset.mode === 'edit') {
            // Update existing product
            const productId = this.dataset.editId;
            const productIndex = products.findIndex(p => p.id === productId);

            if (productIndex !== -1) {
                const oldProduct = products[productIndex];
                const changes = [];

                // Track changes
                if (oldProduct.name !== formData.name) {
                    changes.push(`Name changed from "${oldProduct.name}" to "${formData.name}"`);
                }
                if (oldProduct.price !== formData.price) {
                    changes.push(`Price changed from ${oldProduct.price} to ${formData.price}`);
                }
                if (oldProduct.categoryId !== formData.categoryId) {
                    const oldCategory = categories.find(c => c.id === oldProduct.categoryId)?.name || 'None';
                    const newCategory = categories.find(c => c.id === formData.categoryId)?.name || 'None';
                    changes.push(`Category changed from "${oldCategory}" to "${newCategory}"`);
                }
                if (oldProduct.stockManagement !== formData.stockManagement ||
                    (formData.stockManagement && oldProduct.stock !== formData.stock)) {
                    changes.push(`Stock management updated: ${formData.stock === 'unlimited' ? 'Unlimited' : formData.stock}`);
                }

                // Log changes if any
                if (changes.length > 0) {
                    addProductLog(productId, 'updated', { changes });
                }

                products[productIndex] = {
                    ...oldProduct,
                    ...formData,
                    updatedAt: new Date().toISOString()
                };
                showAlert('Product updated successfully', 'success');
            }
        } else {
            // Create new product
            const newProduct = {
                id: Date.now().toString(),
                ...formData,
                image: '',
                createdAt: new Date().toISOString()
            };
            products.push(newProduct);

            // Log creation
            addProductLog(newProduct.id, 'created', {
                name: newProduct.name,
                category: categories.find(c => c.id === newProduct.categoryId)?.name || 'None',
                price: newProduct.price,
                stock: newProduct.stockManagement ? newProduct.stock : 'Not managed'
            });
            showAlert('Product added successfully', 'success');
        }

        // Save and refresh
        saveToStorage();
        const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
            .map(btn => btn.dataset.categoryId);
        renderProducts(selectedCategories);

        // Reset form
        this.reset();
        this.dataset.mode = 'add';
        delete this.dataset.editId;
        closeModal(productModal);
    });

    // Add image upload preview
    document.getElementById('productImage').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const uploadWrapper = document.querySelector('.image-upload-wrapper');
                uploadWrapper.style.backgroundImage = `url(${e.target.result})`;
                uploadWrapper.style.backgroundSize = 'cover';
                uploadWrapper.style.backgroundPosition = 'center';
                // Hide the default content
                uploadWrapper.querySelector('svg').style.display = 'none';
                uploadWrapper.querySelector('.image-upload-text').style.display = 'none';
                uploadWrapper.querySelector('.image-upload-hint').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Update product category select options
    function updateProductCategoryOptions() {
        const select = document.getElementById('productCategory');
        select.innerHTML = '<option value="">Select category</option>';
        categories.forEach(category => {
            if (category.id !== 'all') { // Skip "All Items" category
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            }
        });
    }

    // Update category options when modal opens
    addProductBtn.addEventListener('click', () => {
        const form = document.getElementById('productForm');
        const modalTitle = productModal.querySelector('.modal-header h3');
        const submitBtn = productModal.querySelector('.btn-save');

        modalTitle.textContent = 'Add New Product';
        submitBtn.textContent = 'Save Product';
        form.dataset.mode = 'add';
        delete form.dataset.editId;

        // Reset image preview
        const uploadWrapper = document.querySelector('.image-upload-wrapper');
        uploadWrapper.style.backgroundImage = '';
        uploadWrapper.querySelector('svg').style.display = 'block';
        uploadWrapper.querySelector('.image-upload-text').style.display = 'block';
        uploadWrapper.querySelector('.image-upload-hint').style.display = 'block';

        updateProductCategoryOptions();
        openModal(productModal);
        setupNumberInputs();
    });

    // Add search functionality
    const searchInput = document.getElementById('searchProduct');
    let searchTimeout;

    searchInput.addEventListener('input', function (e) {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.toLowerCase();

        // Add small delay to prevent too many renders
        searchTimeout = setTimeout(() => {
            if (searchTerm === '') {
                // If search is empty, render based on selected categories
                const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
                    .map(btn => btn.dataset.categoryId);
                renderProducts(selectedCategories);
            } else {
                // Search across all products regardless of category
                const filtered = products.filter(product =>
                    product.name.toLowerCase().includes(searchTerm) ||
                    product.description?.toLowerCase().includes(searchTerm)
                );

                // Special render for search results
                renderProducts('search', filtered);
            }
        }, 300);
    });

    // Update the products grid click handler
    productsGrid.addEventListener('click', (e) => {
        if (e.target.closest('.product-menu-btn')) {
            e.stopPropagation(); // Prevent event bubbling
            const card = e.target.closest('.product-card');
            const menu = card.querySelector('.product-menu');

            // Close all other open menus first
            document.querySelectorAll('.product-menu.show').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });

            menu.classList.toggle('show');
        } else if (e.target.closest('.product-menu-item')) {
            const { action } = e.target.closest('.product-menu-item').dataset;
            const card = e.target.closest('.product-card');
            const productId = card.querySelector('.add-to-cart').dataset.id;
            const product = products.find(p => p.id === productId);

            if (action === 'edit' && product) {
                fillProductForm(product);
                openModal(productModal);
            } else if (action === 'history') {
                showProductHistory(product);
            } else if (action === 'delete' && product) {
                // Tampilkan modal konfirmasi delete
                const confirmModal = document.getElementById('confirmDeleteModal');
                const confirmBtn = confirmModal.querySelector('.btn-delete');

                // Hapus event listener lama jika ada
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

                // Tambah event listener baru
                newConfirmBtn.addEventListener('click', () => {
                    products = products.filter(p => p.id !== productId);
                    saveToStorage();
                    const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
                        .map(btn => btn.dataset.categoryId);
                    renderProducts(selectedCategories);
                    closeModal(confirmModal);
                    showAlert('Product deleted successfully', 'success');
                });

                openModal(confirmModal);
            }

            // Close the menu after action
            card.querySelector('.product-menu').classList.remove('show');
        } else if (e.target.classList.contains('add-to-cart') && !e.target.hasAttribute('disabled')) {
            const productId = e.target.dataset.id;
            addToCart(productId);
        }
    });

    // Tambahkan event listener untuk tombol cancel di modal konfirmasi
    document.querySelectorAll('#confirmDeleteModal .btn-cancel, #confirmDeleteModal .modal-close')
        .forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(document.getElementById('confirmDeleteModal'));
            });
        });

    // Add document click handler to close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-menu') && !e.target.closest('.product-menu-btn')) {
            document.querySelectorAll('.product-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // Add click handlers for cart item buttons
    cartItems.addEventListener('click', (e) => {
        if (e.target.closest('.cancel-edit-btn')) {
            cancelEditing();
        }
        const button = e.target;
        const productId = button.dataset.id;
        if (!productId) return;

        if (button.classList.contains('plus')) {
            const item = cart.find(item => item.productId === productId);
            if (item) updateCartQuantity(productId, item.quantity + 1);
        } else if (button.classList.contains('minus')) {
            const item = cart.find(item => item.productId === productId);
            if (item) updateCartQuantity(productId, item.quantity - 1);
        } else if (button.classList.contains('remove-btn')) {
            updateCartQuantity(productId, 0);
        }
    });

    // Update product buttons status after cart changes
    function updateProductButtonsStatus() {
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            const productId = btn.dataset.id;
            const product = products.find(p => p.id === productId);
            if (product) {
                const stockStatus = getStockStatus(product.stock, productId);
                btn.disabled = stockStatus.disabled === 'disabled';
                btn.textContent = stockStatus.disabled ? 'Out of Stock' : 'Add to Cart';
            }
        });
    }

    // Add click handler for checkout button
    document.querySelector('.checkout-btn').addEventListener('click', function () {
        if (cart.length === 0) {
            showAlert('Cart is empty', 'error');
            return;
        }
        openCheckoutModal();
    });

    function openCheckoutModal() {
        renderCheckoutItems();

        // Reset cash payment fields
        document.getElementById('cashAmount').value = '';
        document.getElementById('changeAmount').textContent = 'Rp 0';

        if (editingOrderId) {
            // Update modal title to show order ID
            const modalTitle = checkoutModal.querySelector('.modal-header h3');
            modalTitle.textContent = `Update Order #${editingOrderId}`;

            const order = orders.find(o => o.id === editingOrderId);
            if (order) {
                // Pre-fill form with order data
                document.getElementById('customerName').value = order.customer || '';
                document.getElementById('orderStatus').value = order.paymentStatus || '';
                document.getElementById('tableNumber').value = order.tableNumber || '';
                document.getElementById('orderNotes').value = order.notes || '';
                document.getElementById('paymentMethod').value = order.paymentMethod || '';

                // Show/hide payment method based on status
                const paymentMethodGroup = document.querySelector('.payment-method-group');
                paymentMethodGroup.style.display = order.paymentStatus === 'paid' ? 'block' : 'none';

                // Update submit button text
                checkoutModal.querySelector('.btn-save').textContent = `Update Order #${editingOrderId}`;
            }
        } else {
            // Reset form and titles for new order
            checkoutForm.reset();
            checkoutModal.querySelector('.modal-header h3').textContent = 'Checkout Order';
            checkoutModal.querySelector('.btn-save').textContent = 'Complete Order';
        }

        openModal(checkoutModal);
    }

    function renderCheckoutItems() {
        const orderItems = checkoutModal.querySelector('.order-items');
        const orderTotals = checkoutModal.querySelector('.order-totals');

        // Render items
        orderItems.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <div class="checkout-item-info">
                    <span class="checkout-item-quantity">×${item.quantity}</span>
                    <span class="checkout-item-name">${item.name}</span>
                </div>
                <span class="checkout-item-price">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
            </div>
        `).join('');

        // Render totals with tooltip for tax rate
        const editingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
        const { subtotal, tax, total } = calculateCartTotals(editingOrder);

        // Get proper tax rate to display
        const displayTaxRate = (editingOrder && editingOrder.paymentStatus === 'paid' && editingOrder.taxRateAtOrder !== null)
            ? editingOrder.taxRateAtOrder
            : settings.taxRate;

        orderTotals.innerHTML = `
            <div class="total-row">
                <span>Subtotal</span>
                <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div class="total-row">
                <span>
                    PPN (${displayTaxRate}%)
                    ${editingOrder && editingOrder.paymentStatus === 'paid' ? '' : `
                        <span class="tax-info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span class="tooltip">Using current tax rate from Settings</span>
                        </span>
                    `}
                </span>
                <span>Rp ${tax.toLocaleString('id-ID')}</span>
            </div>
            <div class="total-row final">
                <span>Total</span>
                <span>Rp ${total.toLocaleString('id-ID')}</span>
            </div>
        `;
    }

    // Add function to generate order ID
    function generateOrderId() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        const datePrefix = `${dd}${mm}${yy}`;

        // Get today's orders and find the latest number
        const todayOrders = orders.filter(order =>
            order.id.startsWith(datePrefix)
        );

        let nextNumber = 1;
        if (todayOrders.length > 0) {
            // Extract the numbers from today's orders and find the highest
            const numbers = todayOrders.map(order =>
                parseInt(order.id.slice(-3))
            );
            nextNumber = Math.max(...numbers) + 1;
        }

        // Create the complete order ID
        return `${datePrefix}${String(nextNumber).padStart(3, '0')}`;
    }

    // Add payment status handler
    document.getElementById('orderStatus').addEventListener('change', function (e) {
        const paymentMethodGroup = document.querySelector('.payment-method-group');
        const paymentMethodSelect = document.getElementById('paymentMethod');
        const cashPaymentGroup = document.querySelector('.cash-payment-group');

        if (e.target.value === 'paid') {
            paymentMethodGroup.style.display = 'block';
            paymentMethodSelect.required = true;

            // Reset cash payment fields
            document.getElementById('cashAmount').value = '';
            document.getElementById('changeAmount').textContent = 'Rp 0';

            // Check if payment method is already set to cash
            if (paymentMethodSelect.value === 'cash') {
                cashPaymentGroup.style.display = 'block';
            } else {
                cashPaymentGroup.style.display = 'none';
            }
        } else {
            paymentMethodGroup.style.display = 'none';
            cashPaymentGroup.style.display = 'none';
            paymentMethodSelect.required = false;
            paymentMethodSelect.value = '';
        }

        // Re-render totals karena tax rate bisa berubah
        renderCheckoutItems();
    });

    // Add payment method handler
    document.getElementById('paymentMethod').addEventListener('change', function (e) {
        const cashPaymentGroup = document.querySelector('.cash-payment-group');

        if (e.target.value === 'cash') {
            cashPaymentGroup.style.display = 'block';
            document.getElementById('cashAmount').required = true;
        } else {
            cashPaymentGroup.style.display = 'none';
            document.getElementById('cashAmount').required = false;
            document.getElementById('cashAmount').value = '';
            document.getElementById('changeAmount').textContent = 'Rp 0';
        }
    });

    // Add cash amount handler
    document.getElementById('cashAmount').addEventListener('input', function (e) {
        const cashAmount = parseFloat(e.target.value) || 0;
        const { total } = calculateCartTotals();
        const change = cashAmount - total;

        document.getElementById('changeAmount').textContent =
            `Rp ${Math.max(0, change).toLocaleString('id-ID')}`;

        // Validate if cash amount is sufficient
        if (cashAmount < total) {
            e.target.setCustomValidity('Insufficient payment amount');
        } else {
            e.target.setCustomValidity('');
        }
    });

    checkoutForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const paymentStatus = document.getElementById('orderStatus').value;
        const paymentMethod = document.getElementById('paymentMethod').value;

        // Get cash payment details if applicable
        let cashAmount = 0;
        let changeAmount = 0;
        if (paymentMethod === 'cash') {
            cashAmount = parseFloat(document.getElementById('cashAmount').value) || 0;
            const { total } = calculateCartTotals();
            changeAmount = Math.max(0, cashAmount - total);
        }

        const orderData = {
            items: cart.map(item => ({ ...item })), // Create deep copy of cart items
            customer: document.getElementById('customerName').value,
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod || null,
            tableNumber: document.getElementById('tableNumber').value || null,
            notes: document.getElementById('orderNotes').value,
            ...calculateCartTotals(),
            status: 'completed',
            // Simpan tax rate hanya jika status paid
            taxRateAtOrder: paymentStatus === 'paid' ? settings.taxRate : null,
            cashAmount: paymentMethod === 'cash' ? cashAmount : null,
            changeAmount: paymentMethod === 'cash' ? changeAmount : null
        };

        if (editingOrderId) {
            // Update existing order
            const orderIndex = orders.findIndex(o => o.id === editingOrderId);
            if (orderIndex !== -1) {
                const oldOrder = orders[orderIndex];
                orderData.id = editingOrderId;
                orderData.createdAt = oldOrder.createdAt;
                orderData.updatedAt = new Date().toISOString();

                // Jika sebelumnya unpaid dan sekarang paid, simpan tax rate
                if (oldOrder.paymentStatus === 'unpaid' && orderData.paymentStatus === 'paid') {
                    orderData.taxRateAtOrder = settings.taxRate;
                } else if (orderData.paymentStatus === 'unpaid') {
                    // Jika masih/diubah ke unpaid, hapus tax rate yang tersimpan
                    orderData.taxRateAtOrder = null;
                } else {
                    // Jika sudah paid sebelumnya, pertahankan tax rate lama
                    orderData.taxRateAtOrder = oldOrder.taxRateAtOrder;
                }

                // Update stock if payment status changes from unpaid to paid
                if (orderData.paymentStatus === 'paid' && oldOrder.paymentStatus === 'unpaid') {
                    cart.forEach(item => {
                        const product = products.find(p => p.id === item.productId);
                        if (product && product.stockManagement && product.stock !== 'unlimited') {
                            updateProductStock(item.productId, -item.quantity, `Order ${orderData.id}`);
                        }
                    });
                }

                orders[orderIndex] = orderData;
                showAlert('Order updated successfully!', 'success');
            }
        } else {
            // Create new order
            orderData.id = generateOrderId();
            orderData.createdAt = new Date().toISOString();
            orders.push(orderData);

            // Update stock for new paid orders
            if (orderData.paymentStatus === 'paid') {
                cart.forEach(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (product && product.stockManagement && product.stock !== 'unlimited') {
                        updateProductStock(item.productId, -item.quantity, `Order ${orderData.id}`);
                    }
                });
            }

            showAlert('Order completed successfully!', 'success');
        }

        // Save orders
        localStorage.setItem('orders', JSON.stringify(orders));

        // Tambahkan ini untuk update badge setelah checkout
        updateMenuBadges();

        // Reset everything
        editingOrderId = null;
        saveEditingState();
        document.querySelector('.checkout-btn').textContent = 'Checkout';
        cart = [];
        saveCart();
        renderCart();

        // Close modal and cleanup
        closeModal(checkoutModal);
        checkoutForm.reset();
    });

    // Add Order History button click handler
    orderHistoryBtn.addEventListener('click', () => {
        searchOrder.value = ''; // Clear search when opening modal
        renderOrderHistory();
        openModal(orderHistoryModal);
    });

    function loadOrderToCart(order) {
        // Clear existing cart
        cart = [];

        // Load items to cart
        cart = order.items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));

        // Save cart state
        saveCart();

        // Set editing mode
        editingOrderId = order.id;
        saveEditingState();

        // Update checkout button text with order ID
        document.querySelector('.checkout-btn').textContent = `Update Order #${order.id}`;

        // Re-render cart to show editing status
        renderCart();

        // Show editing indicator
        showAlert('Editing Order #' + order.id + '. Add or remove items as needed.', 'info');

        // Close order history modal
        closeModal(orderHistoryModal);
    }

    let currentFilter = 'all'; // Track active filter

    // Add filter click handler
    document.querySelector('.filter-group').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            // Update filter
            currentFilter = e.target.dataset.filter;

            // Re-render with current search term
            renderOrderHistory(searchOrder.value);
        }
    });

    // Add helper function for consistent datetime formatting
    function formatDateTime(date) {
        const d = new Date(date);
        return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '');
    }

    function renderOrderHistory(searchTerm = '') {
        const orderList = orderHistoryModal.querySelector('.order-history-list');

        // Calculate summary statistics
        const totalOrders = orders.length;
        const unpaidOrders = orders.filter(order => order.paymentStatus === 'unpaid');
        const paidOrders = orders.filter(order => order.paymentStatus === 'paid');

        const unpaidAmount = unpaidOrders.reduce((sum, order) => sum + order.total, 0);
        const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);

        // Update summary display
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('unpaidOrders').textContent = unpaidOrders.length;
        document.getElementById('paidOrders').textContent = paidOrders.length;
        document.getElementById('unpaidAmount').textContent = `Rp ${unpaidAmount.toLocaleString('id-ID')}`;
        document.getElementById('totalRevenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;

        // First apply search filter if exists
        let filteredOrders = orders;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filteredOrders = orders.filter(order =>
                order.customer.toLowerCase().includes(search) ||
                (order.tableNumber && order.tableNumber.toString().includes(search))
            );
        }

        // Then apply status filter
        if (currentFilter !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.paymentStatus === currentFilter);
        }

        // Sort by date
        const sortedOrders = filteredOrders.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Show empty state if no orders
        if (sortedOrders.length === 0) {
            orderList.innerHTML = `
                <div class="no-orders">
                    <p>No ${currentFilter !== 'all' ? currentFilter + ' ' : ''}orders found${searchTerm ? ' for "' + searchTerm + '"' : ''}</p>
                </div>
            `;
            return;
        }

        orderList.innerHTML = sortedOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-header-left">
                        <h4>Order #${order.id}</h4>
                        <div class="order-meta">
                            <span>${formatDateTime(order.createdAt)}</span>
                            <span class="order-badge badge-customer">
                                <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${order.customer}
                            </span>
                            ${order.tableNumber ? `
                                <span class="order-badge badge-table">
                                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M3 3h18v18H3z"></path>
                                        <path d="M3 9h18"></path>
                                        <path d="M12 3v18"></path>
                                    </svg>
                                    Table #${order.tableNumber}
                                </span>
                            ` : ''}
                            <span class="order-badge ${order.paymentStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                                ${order.paymentStatus.toUpperCase()}
                                ${order.paymentMethod ? ` - ${order.paymentMethod.toUpperCase()}` : ''}
                            </span>
                        </div>
                    </div>
                    <div class="order-actions">
                        ${order.paymentStatus === 'paid' ? `
                            <button class="btn-print" data-id="${order.id}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9V2h12v7"></path>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <path d="M6 14h12v8H6z"></path>
                                </svg>
                                Print Receipt
                            </button>
                        ` : ''}
                        ${order.paymentStatus === 'unpaid' ? `
                            <button class="btn-edit" data-id="${order.id}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit Order
                            </button>
                        ` : ''}
                        <div class="order-amount">
                            Rp ${order.total.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div class="collapse-indicator">
                        <span class="collapse-text">Click to view items</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-product-list">
                        ${order.items.map(item => `
                            <div class="order-product-item">
                                <div class="order-product-info">
                                    <span class="order-product-quantity">×${item.quantity}</span>
                                    <span>${item.name}</span>
                                </div>
                                <span>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${order.notes ? `
                        <div class="order-notes">
                            <small>Notes:</small>
                            <p>${order.notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add print button click handler
        orderList.querySelectorAll('.btn-print').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = btn.dataset.id;
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    printReceipt(order);
                }
            });
        });

        // Add click handlers for order items
        orderList.querySelectorAll('.order-item').forEach(item => {
            const header = item.querySelector('.order-header');
            const details = item.querySelector('.order-details');
            const editBtn = item.querySelector('.btn-edit');

            // Add edit button handler
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const orderId = editBtn.dataset.id;
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        loadOrderToCart(order);
                        closeModal(orderHistoryModal);
                    }
                });
            }

            header.addEventListener('click', (e) => {
                // Don't expand if clicking edit button
                if (e.target.closest('.btn-edit')) return;

                // Toggle expanded class for styling
                item.classList.toggle('expanded');
                details.classList.toggle('show');

                // Update collapse text
                const collapseText = item.querySelector('.collapse-text');
                collapseText.textContent = details.classList.contains('show')
                    ? 'Click to hide items'
                    : 'Click to view items';
            });
        });

        updateMenuBadges();
    }

    // Add search handler for order history
    const searchOrder = document.getElementById('searchOrder');
    let searchOrderTimeout;

    searchOrder.addEventListener('input', (e) => {
        clearTimeout(searchOrderTimeout);
        searchOrderTimeout = setTimeout(() => {
            renderOrderHistory(e.target.value);
        }, 300);
    });

    function updateMenuBadges() {
        const unpaidCount = orders.filter(o => o.paymentStatus === 'unpaid').length;
        const orderHistoryItem = document.getElementById('orderHistoryBtn');
        const existingBadge = orderHistoryItem.querySelector('.menu-badge');

        // Remove existing badge jika ada
        if (existingBadge) {
            existingBadge.remove();
        }

        // Add badge jika ada unpaid orders
        if (unpaidCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'menu-badge';
            badge.textContent = unpaidCount;
            orderHistoryItem.appendChild(badge);
        }

        // Update badge juga di history modal jika sedang terbuka
        if (orderHistoryModal.classList.contains('active')) {
            document.getElementById('unpaidOrders').textContent = unpaidCount;

            // Update juga total unpaid amount
            const unpaidAmount = orders
                .filter(o => o.paymentStatus === 'unpaid')
                .reduce((sum, order) => sum + order.total, 0);
            document.getElementById('unpaidAmount').textContent =
                `Rp ${unpaidAmount.toLocaleString('id-ID')}`;
        }
    }

    // Update fungsi untuk menampilkan history
    function showProductHistory(product) {
        const modal = document.getElementById('productHistoryModal');
        const headerInfo = modal.querySelector('.history-product-info');
        const timeline = modal.querySelector('.history-timeline');
        const category = categories.find(c => c.id === product.categoryId);

        // Render product info
        headerInfo.innerHTML = `
            <div class="history-product-image" style="background-image: url(${product.image || ''})"></div>
            <div class="history-product-details">
                <h4>${product.name}</h4>
                <span class="category" style="background-color: ${category?.color || '#CBD5E0'}">${category?.name || 'Uncategorized'}</span>
                <p>Rp ${parseInt(product.price).toLocaleString('id-ID')}</p>
            </div>
        `;

        // Render timeline
        const logs = productLogs[product.id] || [];
        timeline.innerHTML = logs.length === 0 ? '<p class="no-history">No history available</p>' :
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(log => {
                    return `
                    <div class="timeline-item ${log.action}">
                        <div class="timeline-header">
                            <span class="timeline-action">${log.action.charAt(0).toUpperCase() + log.action.slice(1)}</span>
                            <span class="timeline-date">${formatDateTime(log.timestamp)}</span>
                        </div>
                        <div class="timeline-content">
                            ${renderLogDetails(log)}
                        </div>
                    </div>
                `;
                }).join('');

        openModal(modal);
    }

    function renderLogDetails(log) {
        switch (log.action) {
            case 'created':
                return `
                    <div class="timeline-details">
                        <div class="timeline-detail-item">
                            <span class="detail-label">Product Created</span>
                            <span class="detail-value">${log.details.name}</span>
                        </div>
                        <div class="timeline-detail-item">
                            <span class="detail-label">Initial Price</span>
                            <span class="detail-value">Rp ${parseInt(log.details.price).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="timeline-detail-item">
                            <span class="detail-label">Category</span>
                            <span class="detail-value">${log.details.category}</span>
                        </div>
                    </div>
                `;
            case 'updated':
                return `
                    <div class="timeline-details">
                        ${log.details.changes.map(change => `
                            <div class="timeline-detail-item">
                                <span class="detail-label">Change</span>
                                <span class="detail-value">${change}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'stock':
                const changeClass = log.details.change > 0 ? 'increased' : 'decreased';
                return `
                    <div class="timeline-details">
                        <div class="timeline-detail-item">
                            <span class="detail-label">Stock Change</span>
                            <span class="detail-value ${changeClass}">
                                ${log.details.change > 0 ? '+' : ''}${log.details.change}
                            </span>
                        </div>
                        <div class="timeline-detail-item">
                            <span class="detail-label">New Stock Level</span>
                            <span class="detail-value">${log.details.newStock}</span>
                        </div>
                        ${log.details.reason ? `
                            <div class="timeline-detail-item">
                                <span class="detail-label">Reason</span>
                                <span class="detail-value">${log.details.reason}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            default:
                return `<p>${JSON.stringify(log.details)}</p>`;
        }
    }

    // Update stock tracking di checkout
    function updateProductStock(productId, changeAmount, reason) {
        const product = products.find(p => p.id === productId);
        if (product && product.stockManagement && product.stock !== 'unlimited') {
            const oldStock = parseInt(product.stock);
            product.stock = (oldStock + changeAmount).toString();

            addProductLog(productId, 'stock', {
                change: changeAmount,
                newStock: product.stock,
                reason
            });

            saveToStorage();

            // Re-render products untuk update tampilan stock secara realtime
            const selectedCategories = [...document.querySelectorAll('.category-btn.selected')]
                .map(btn => btn.dataset.categoryId);
            renderProducts(selectedCategories);
        }
    }

    // Initial render
    renderCategories();
    renderProducts();
    renderCart();

    // Menu Toggle
    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        menuDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            menuBtn.classList.remove('active');
            menuDropdown.classList.remove('show');
        }
    });

    // Modal functions
    function openModal(modal) {
        modal.classList.add('active');
        menuBtn.classList.remove('active');
        menuDropdown.classList.remove('show');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // Event listeners for modals
    addCategoryBtn.addEventListener('click', () => openModal(categoryModal));
    addProductBtn.addEventListener('click', () => openModal(productModal));

    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.closest('.modal'));
        });
    });

    cancelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.closest('.modal'));
        });
    });

    // Initial cart render
    renderCart();
    updateMenuBadges();

    // Add custom number input controls
    function setupNumberInputs() {
        document.querySelectorAll('.form-group input[type="number"]').forEach(input => {
            if (input.parentElement.classList.contains('number-input-wrapper')) return;

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'number-input-wrapper';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);

            // Create controls
            const controls = document.createElement('div');
            controls.className = 'number-controls';
            controls.innerHTML = `
                <button type="button" class="number-control-btn increment">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>
                <button type="button" class="number-control-btn decrement">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            `;
            wrapper.appendChild(controls);

            // Add event listeners
            controls.querySelector('.increment').addEventListener('click', () => {
                const step = input.getAttribute('step') || 1;
                const max = input.getAttribute('max');
                const newValue = parseFloat(input.value || 0) + parseFloat(step);

                if (!max || newValue <= parseFloat(max)) {
                    input.value = newValue;
                    input.dispatchEvent(new Event('change'));
                }
            });

            controls.querySelector('.decrement').addEventListener('click', () => {
                const step = input.getAttribute('step') || 1;
                const min = input.getAttribute('min');
                const newValue = parseFloat(input.value || 0) - parseFloat(step);

                if (!min || newValue >= parseFloat(min)) {
                    input.value = newValue;
                    input.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    // Call setupNumberInputs after modal opens
    addProductBtn.addEventListener('click', () => {
        openModal(productModal);
        setupNumberInputs();
    });

    settingsBtn.addEventListener('click', () => {
        fillSettingsForm();
        openModal(settingsModal);
        setupNumberInputs();
    });

    // Initial setup for any number inputs in the main view
    setupNumberInputs();

    // Function to save editing state
    function saveEditingState() {
        if (editingOrderId) {
            localStorage.setItem('editingOrderId', editingOrderId);
        } else {
            localStorage.removeItem('editingOrderId');
        }
        updateMenuBadges(); // Add this
    }

    function cancelEditing() {
        editingOrderId = null;
        cart = [];
        saveCart();
        saveEditingState();
        document.querySelector('.checkout-btn').textContent = 'Checkout';
        renderCart();
        showAlert('Edit session cancelled', 'info');
        updateMenuBadges(); // Add this
    }

    // Update the checkout button text during initial load if editing
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (editingOrderId) {
        checkoutBtn.textContent = `Update Order #${editingOrderId}`;
    }

    // Helper function for receipt date formatting
    function formatReceiptDateTime(date, includeSeconds = true) {
        const d = new Date(date);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        };

        if (includeSeconds) {
            options.second = '2-digit';
        }

        return d.toLocaleString('id-ID', options)
            .replace(/\./g, '/') // Ganti titik dengan slash untuk tanggal
            .replace(',', '');   // Hapus koma antara tanggal dan waktu
    }

    // Helper function untuk handle conditional blocks in receipt template
    function handleConditionalBlocks(template, data) {
        // Handle table number conditional
        if (data.tableNumber) {
            template = template.replace(
                /{{#if tableNumber}}([\s\S]*?){{\/if}}/g,
                '$1'
            );
        } else {
            template = template.replace(
                /{{#if tableNumber}}[\s\S]*?{{\/if}}/g,
                ''
            );
        }

        // Handle payment method conditional
        if (data.paymentMethod) {
            template = template.replace(
                /{{#if paymentMethod}}([\s\S]*?){{\/if}}/g,
                '$1'
            );
        } else {
            template = template.replace(
                /{{#if paymentMethod}}[\s\S]*?{{\/if}}/g,
                ''
            );
        }

        // Handle notes conditional
        if (data.orderNotes) {
            template = template.replace(
                /{{#if orderNotes}}([\s\S]*?){{\/if}}/g,
                '$1'
            );
        } else {
            template = template.replace(
                /{{#if orderNotes}}[\s\S]*?{{\/if}}/g,
                ''
            );
        }

        // Add handler for cash payment conditional
        if (data.isCashPayment) {
            template = template.replace(
                /{{#if isCashPayment}}([\s\S]*?){{\/if}}/g,
                '$1'
            );
        } else {
            template = template.replace(
                /{{#if isCashPayment}}[\s\S]*?{{\/if}}/g,
                ''
            );
        }

        return template;
    }

    // Helper function for items loop in receipt template
    function handleItemsLoop(template, items) {
        const itemsMatch = template.match(/{{#each items}}([\s\S]*?){{\/each}}/);
        if (!itemsMatch) return template;

        const itemTemplate = itemsMatch[1];
        const itemsHtml = items.map(item => {
            let html = itemTemplate;
            for (const [key, value] of Object.entries(item)) {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
            return html;
        }).join('');

        return template.replace(/{{#each items}}[\s\S]*?{{\/each}}/, itemsHtml);
    }

    // Print receipt function
    async function printReceipt(order) {
        try {
            const response = await fetch('receipt.html');
            let template = await response.text();

            // Prepare data for template
            const receiptData = {
                storeName: settings.storeName || 'WarkoPOS',
                storeAddress: settings.storeAddress || '',
                orderId: order.id,
                orderDate: formatReceiptDateTime(order.createdAt, false), // Tanpa detik untuk orderDate
                customerName: order.customer,
                tableNumber: order.tableNumber,
                items: order.items.map(item => ({
                    ...item,
                    price: item.price.toLocaleString('id-ID'),
                })),
                subtotal: order.subtotal.toLocaleString('id-ID'),
                taxRate: order.taxRateAtOrder || settings.taxRate, // Gunakan tax rate saat order dibuat
                tax: order.tax.toLocaleString('id-ID'),
                total: order.total.toLocaleString('id-ID'),
                paymentStatus: order.paymentStatus.toUpperCase(),
                paymentMethod: order.paymentMethod?.toUpperCase(),
                orderNotes: order.notes,
                footerText: settings.receiptFooter,
                timestamp: formatReceiptDateTime(new Date()),
                // Add cash payment details
                isCashPayment: order.paymentMethod === 'cash' &&
                    order.paymentStatus === 'paid' &&
                    order.cashAmount &&
                    order.changeAmount,
                // Tambahkan pengecekan nilai
                cashAmount: order.cashAmount?.toLocaleString('id-ID') || '0',
                changeAmount: order.changeAmount?.toLocaleString('id-ID') || '0',
            };

            // Generate Barcode (gunakan order ID saja)
            receiptData.barcodeUrl = `https://barcodeapi.org/api/code128/${order.id}`;

            // Replace template variables
            for (const [key, value] of Object.entries(receiptData)) {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, value);
            }

            // Handle conditional blocks and loops
            template = handleConditionalBlocks(template, receiptData);
            template = handleItemsLoop(template, receiptData.items);

            // Create print window
            const printWindow = window.open('', 'Print Receipt', 'height=600,width=400');
            printWindow.document.write(template);

            // Wait for images to load before printing
            setTimeout(() => {
                printWindow.print();
                setTimeout(() => {
                    printWindow.close();
                }, 250);
            }, 750);

        } catch (error) {
            console.error('Error printing receipt:', error);
            showAlert('Failed to print receipt', 'error');
        }
    }

    // Update order history render dengan print handler
    function renderOrderHistory(searchTerm = '') {
        const orderList = orderHistoryModal.querySelector('.order-history-list');

        // Calculate summary statistics
        const totalOrders = orders.length;
        const unpaidOrders = orders.filter(order => order.paymentStatus === 'unpaid');
        const paidOrders = orders.filter(order => order.paymentStatus === 'paid');

        const unpaidAmount = unpaidOrders.reduce((sum, order) => sum + order.total, 0);
        const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);

        // Update summary display
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('unpaidOrders').textContent = unpaidOrders.length;
        document.getElementById('paidOrders').textContent = paidOrders.length;
        document.getElementById('unpaidAmount').textContent = `Rp ${unpaidAmount.toLocaleString('id-ID')}`;
        document.getElementById('totalRevenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;

        // First apply search filter if exists
        let filteredOrders = orders;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filteredOrders = orders.filter(order =>
                order.customer.toLowerCase().includes(search) ||
                (order.tableNumber && order.tableNumber.toString().includes(search))
            );
        }

        // Then apply status filter
        if (currentFilter !== 'all') {
            filteredOrders = filteredOrders.filter(order => order.paymentStatus === currentFilter);
        }

        // Sort by date
        const sortedOrders = filteredOrders.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // Show empty state if no orders
        if (sortedOrders.length === 0) {
            orderList.innerHTML = `
                <div class="no-orders">
                    <p>No ${currentFilter !== 'all' ? currentFilter + ' ' : ''}orders found${searchTerm ? ' for "' + searchTerm + '"' : ''}</p>
                </div>
            `;
            return;
        }

        orderList.innerHTML = sortedOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-header-left">
                        <h4>Order #${order.id}</h4>
                        <div class="order-meta">
                            <span>${formatDateTime(order.createdAt)}</span>
                            <span class="order-badge badge-customer">
                                <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${order.customer}
                            </span>
                            ${order.tableNumber ? `
                                <span class="order-badge badge-table">
                                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M3 3h18v18H3z"></path>
                                        <path d="M3 9h18"></path>
                                        <path d="M12 3v18"></path>
                                    </svg>
                                    Table #${order.tableNumber}
                                </span>
                            ` : ''}
                            <span class="order-badge ${order.paymentStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}">
                                ${order.paymentStatus.toUpperCase()}
                                ${order.paymentMethod ? ` - ${order.paymentMethod.toUpperCase()}` : ''}
                            </span>
                        </div>
                    </div>
                    <div class="order-actions">
                        ${order.paymentStatus === 'paid' ? `
                            <button class="btn-print" data-id="${order.id}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9V2h12v7"></path>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <path d="M6 14h12v8H6z"></path>
                                </svg>
                                Print Receipt
                            </button>
                        ` : ''}
                        ${order.paymentStatus === 'unpaid' ? `
                            <button class="btn-edit" data-id="${order.id}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit Order
                            </button>
                        ` : ''}
                        <div class="order-amount">
                            Rp ${order.total.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <div class="collapse-indicator">
                        <span class="collapse-text">Click to view items</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-product-list">
                        ${order.items.map(item => `
                            <div class="order-product-item">
                                <div class="order-product-info">
                                    <span class="order-product-quantity">×${item.quantity}</span>
                                    <span>${item.name}</span>
                                </div>
                                <span>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${order.notes ? `
                        <div class="order-notes">
                            <small>Notes:</small>
                            <p>${order.notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add print button click handler
        orderList.querySelectorAll('.btn-print').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = btn.dataset.id;
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    printReceipt(order);
                }
            });
        });

        // Add click handlers for order items
        orderList.querySelectorAll('.order-item').forEach(item => {
            const header = item.querySelector('.order-header');
            const details = item.querySelector('.order-details');
            const editBtn = item.querySelector('.btn-edit');

            // Add edit button handler
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const orderId = editBtn.dataset.id;
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        loadOrderToCart(order);
                        closeModal(orderHistoryModal);
                    }
                });
            }

            header.addEventListener('click', (e) => {
                // Don't expand if clicking edit button
                if (e.target.closest('.btn-edit')) return;

                // Toggle expanded class for styling
                item.classList.toggle('expanded');
                details.classList.toggle('show');

                // Update collapse text
                const collapseText = item.querySelector('.collapse-text');
                collapseText.textContent = details.classList.contains('show')
                    ? 'Click to hide items'
                    : 'Click to view items';
            });
        });

        updateMenuBadges();
    }
}); // Tambahkan ini untuk menutup addEventListener
