import { Product } from "./Product";

let allProducts: Product[] = []; 
let filteredProducts: Product[] = [];
let currentPage = 1;
const productsPerPage = 9;
let currentSortOrder = 'mais-recentes';
let cart: Product[] = [];

const activeFilters = {
    colors: new Set<string>(),
    sizes: new Set<string>(),
    priceRange: ''
};

const API_URL = 'http://localhost:5000/products';

async function initializeApp(): Promise<void> {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
    
    allProducts = await response.json();
    filteredProducts = [...allProducts];

    renderFilterOptions();
    cloneFiltersToMobile();
    renderProducts();
    setupEventListeners();
    initializeSortDropdown();

  } catch (error) {
    console.error('Falha ao inicializar a aplicação:', error);
    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
      productGrid.innerHTML = '<p>Erro ao carregar produtos. Tente novamente mais tarde.</p>';
    }
  }
}

function addToCart(productId: string): void {
    const productToAdd = allProducts.find(p => p.id === productId);
    if (productToAdd) {
        cart.push(productToAdd);
        updateCartBadge();
        console.log('Carrinho:', cart);
    }
}

function updateCartBadge(): void {
    const cartBadge = document.querySelector('.header__cart-badge');
    if (cartBadge) {
        cartBadge.textContent = cart.length.toString();
        cartBadge.classList.add('animate');
        setTimeout(() => cartBadge.classList.remove('animate'), 300);
    }
}

function cloneFiltersToMobile(): void {
    const desktopFilters = document.getElementById('desktop-filters');
    const mobileFiltersContent = document.getElementById('mobile-filters-content');
    if (desktopFilters && mobileFiltersContent) {
        mobileFiltersContent.innerHTML = desktopFilters.innerHTML;
        
        const filterTitles = mobileFiltersContent.querySelectorAll('.filter-section__title');
        filterTitles.forEach(title => {
            if (!title.querySelector('.icon-arrow')) {
                title.innerHTML = `${title.textContent} <span class="icon-arrow"></span>`;
            }
        });
    }
}

function openFilterOverlay(): void {
    const filterOverlay = document.querySelector('.overlay#filter-overlay');
    filterOverlay?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeFilterOverlay(): void {
    const filterOverlay = document.querySelector('.overlay#filter-overlay');
    filterOverlay?.classList.remove('is-open');
    document.body.style.overflow = '';
}

function updateProductDisplay(): void {
    let result = [...allProducts];
    if (activeFilters.colors.size > 0) result = result.filter(p => activeFilters.colors.has(p.color));
    if (activeFilters.sizes.size > 0) result = result.filter(p => p.size.some(s => activeFilters.sizes.has(s)));
    if (activeFilters.priceRange) {
        const [min, max] = activeFilters.priceRange.split('-').map(Number);
        result = result.filter(p => max ? p.price >= min && p.price <= max : p.price >= min);
    }
    switch (currentSortOrder) {
        case 'menor-preco': result.sort((a, b) => a.price - b.price); break;
        case 'maior-preco': result.sort((a, b) => b.price - a.price); break;
        default: result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); break;
    }
    filteredProducts = result;
    currentPage = 1;
    renderProducts();
}

function renderProducts(): void {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    const productsToRender = filteredProducts.slice(0, currentPage * productsPerPage);
    if (productsToRender.length === 0) {
        productGrid.innerHTML = '<p>Nenhum produto encontrado com os filtros selecionados.</p>';
    } else {
        productGrid.innerHTML = productsToRender.map(createProductCard).join('');
    }
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = productsToRender.length >= filteredProducts.length ? 'none' : 'block';
    }
}

function createProductCard(product: Product): string {
    const priceFormatted = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    const installmentValue = product.parcelamento[1].toFixed(2).replace('.', ',');
    const installmentText = `até ${product.parcelamento[0]}x de R$${installmentValue}`;
    return `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}" class="product-card__image">
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__price">${priceFormatted}</p>
        <p class="product-card__installments">${installmentText}</p>
        <button class="btn btn--primary product-card__button" data-product-id="${product.id}">Comprar</button>
      </div>
    `;
}

function renderFilterOptions(): void {
    const colors = [...new Set(allProducts.map(p => p.color))];
    const sizes = [...new Set(allProducts.flatMap(p => p.size))];
    const colorsContainer = document.getElementById('filter-colors');
    if (colorsContainer) {
        colorsContainer.innerHTML = colors.map(color => `
            <li>
                <input type="checkbox" id="color-${color}" name="color" value="${color}" class="filter-checkbox">
                <label for="color-${color}">${color}</label>
            </li>
        `).join('');
    }
    const sizesContainer = document.getElementById('filter-sizes');
    if (sizesContainer) {
        sizesContainer.innerHTML = sizes.sort().map(size => `
            <button class="size-btn" value="${size}">${size}</button>
        `).join('');
    }
}

function initializeSortDropdown(): void {
    const sortDropdownList = document.getElementById('sort-dropdown-list');
    if (sortDropdownList) {
        const activeItem = sortDropdownList.querySelector(`[data-value="${currentSortOrder}"]`);
        if (activeItem) {
            activeItem.classList.add('is-active');
        }
    }
}


function setupEventListeners(): void {
    const desktopFilters = document.getElementById('desktop-filters');
    const mobileFiltersContent = document.getElementById('mobile-filters-content');
    const productGrid = document.getElementById('product-grid');
    const sortOverlay = document.getElementById('sort-overlay');

    const handleInteraction = (event: Event) => {
        const target = event.target as HTMLElement;
        let filtersChanged = false;

        const accordionTitle = target.closest('.filter-section__title');
        if (accordionTitle) {
            accordionTitle.parentElement?.classList.toggle('is-open');
        }

        if (target.matches('input[type="checkbox"]')) {
            filtersChanged = true;
            const input = target as HTMLInputElement;
            if (input.name === 'color') {
                if (input.checked) activeFilters.colors.add(input.value);
                else activeFilters.colors.delete(input.value);
            }
            if (input.name === 'price') {
                activeFilters.priceRange = input.checked ? input.value : '';
            }
        }

        if (target.matches('.size-btn')) {
            filtersChanged = true;
            const button = target as HTMLButtonElement;
            const size = button.value;
            const isSelected = activeFilters.sizes.has(size);
            document.querySelectorAll(`.size-btn[value="${size}"]`).forEach(btn => {
                btn.classList.toggle('is-selected', !isSelected);
            });
            if (isSelected) activeFilters.sizes.delete(size);
            else activeFilters.sizes.add(size);
        }

        if (filtersChanged) {
            updateProductDisplay();
        }
    };

    desktopFilters?.addEventListener('click', handleInteraction);
    desktopFilters?.addEventListener('change', handleInteraction);
    mobileFiltersContent?.addEventListener('click', handleInteraction);
    mobileFiltersContent?.addEventListener('change', handleInteraction);

    document.getElementById('load-more-btn')?.addEventListener('click', () => {
        currentPage++;
        renderProducts();
    });
    const sortDropdown = document.getElementById('sort-dropdown');
    const sortDropdownList = document.getElementById('sort-dropdown-list');
    
    sortDropdown?.addEventListener('click', () => {
        sortDropdown.classList.toggle('is-open');
    });
    
    sortDropdownList?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.sort-dropdown__item')) {
            sortDropdownList.querySelectorAll('.sort-dropdown__item').forEach(item => {
                item.classList.remove('is-active');
            });
            
            target.classList.add('is-active');
            
            currentSortOrder = target.dataset.value || 'mais-recentes';
            updateProductDisplay();
            sortDropdown?.classList.remove('is-open');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!sortDropdown?.contains(e.target as Node)) {
            sortDropdown?.classList.remove('is-open');
        }
    });
    document.getElementById('mobile-sort-btn')?.addEventListener('click', () => {
        sortOverlay?.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    });
    sortOverlay?.querySelector('.close-overlay-btn')?.addEventListener('click', () => {
        sortOverlay?.classList.remove('is-open');
        document.body.style.overflow = '';
    });
    sortOverlay?.querySelector('.sort-options-list')?.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.sort-option-btn')) {
            currentSortOrder = target.dataset.value || 'mais-recentes';
            updateProductDisplay();
            sortOverlay?.classList.remove('is-open');
            document.body.style.overflow = '';
        }
    });
    document.getElementById('mobile-filter-btn')?.addEventListener('click', openFilterOverlay);
    document.getElementById('close-overlay-btn')?.addEventListener('click', closeFilterOverlay);
    document.getElementById('apply-mobile-filters-btn')?.addEventListener('click', closeFilterOverlay);
    productGrid?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.product-card__button')) {
            const productId = target.dataset.productId;
            if (productId) addToCart(productId);
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);