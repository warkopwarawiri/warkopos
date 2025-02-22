# WarkoPOS Customization Guide

## Style Customization

### CSS Variables
WarkoPOS uses CSS custom properties for easy theme customization. Edit these variables in `style.css`:

```css
:root {
    --primary-color: #6B46C1;
    --primary-light: #9F7AEA;
    --gray-100: #F7FAFC;
    --gray-200: #EDF2F7;
    --gray-800: #1A202C;
}
```

### Layout Customization
The application uses a grid layout that can be modified:

```css
.pos-container {
    display: grid;
    grid-template-columns: 220px 1fr 380px;
    height: 100vh;
    max-width: 1920px;
    margin: 0 auto;
}
```

## Receipt Customization

### Template Modification
Edit `receipt.html` to customize receipt layout:

- Header section
- Item display format
- Totals section
- Footer content
- Barcode placement

### Receipt Styling
Modify receipt styles in the embedded CSS:

```css
.receipt-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px dashed #CBD5E0;
}
```

## Feature Customization

### Settings Configuration
Modify default settings in `app.js`:

```javascript
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
```

### Adding New Features

1. **HTML Modifications**
   - Add new elements to `index.html`
   - Follow existing modal patterns for new forms
   - Maintain consistent styling

2. **JavaScript Integration**
   - Add event listeners in `app.js`
   - Follow existing patterns for data management
   - Update localStorage as needed

3. **Style Integration**
   - Add new CSS classes in `style.css`
   - Maintain consistent visual hierarchy
   - Follow existing naming conventions

## Responsive Design

### Breakpoint Customization
```css
@media (max-width: 1024px) {
    .pos-container {
        grid-template-columns: 180px 1fr 320px;
    }
}

@media (max-width: 768px) {
    .pos-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
    }
}
```

## Data Structure Customization

### Product Schema
```javascript
const productSchema = {
    id: String,
    name: String,
    price: Number,
    categoryId: String,
    description: String,
    internalNotes: String,
    stockManagement: Boolean,
    stock: String,
    image: String,
    createdAt: Date,
    updatedAt: Date
};
```

### Order Schema
```javascript
const orderSchema = {
    id: String,
    items: Array,
    customer: String,
    paymentStatus: String,
    paymentMethod: String,
    tableNumber: String,
    notes: String,
    subtotal: Number,
    tax: Number,
    total: Number,
    status: String,
    createdAt: Date,
    updatedAt: Date
};
```