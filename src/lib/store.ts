// ============================================
// Pro Gas Management — Data Store
// Lightweight JSON-based persistence (localStorage)
// ============================================

export interface Product {
    id: number;
    name: string;
    nameTh: string;
    unit: string;
    icon: string;
}

export interface Customer {
    id: number;
    name: string;
    nameTh: string;
}

export interface InventoryItem {
    productId: number;
    stockFull: number;
    stockEmpty: number;
    stockRepair: number;
}

export interface AssetDebt {
    customerId: number;
    productId: number;
    activeDebt: number;
}

export interface Transaction {
    id: string;
    type: 'delivery' | 'return';
    customerId: number;
    items: { productId: number; quantity: number; isDamaged?: boolean }[];
    photoUrl?: string;
    signatureUrl?: string;
    gpsLat?: number;
    gpsLng?: number;
    notes?: string;
    createdAt: string;
}

// === Master Data ===
export const PRODUCTS: Product[] = [
    { id: 1, name: 'Oxygen Pack 16', nameTh: 'ลมแพค 16', unit: 'ชุด', icon: '🟢' },
    { id: 2, name: 'Oxygen Pack 12', nameTh: 'ลมแพค 12', unit: 'ชุด', icon: '🟢' },
    { id: 3, name: 'LPG 15kg', nameTh: 'แก๊ส 15 กก.', unit: 'ถัง', icon: '🔴' },
];

export const CUSTOMERS: Customer[] = [
    { id: 1, name: 'Chang Pu', nameTh: 'ช่างปู' },
    { id: 2, name: 'Chang Eed', nameTh: 'ช่างอี๊ด' },
    { id: 3, name: 'Chang Pol', nameTh: 'ช่างพล' },
    { id: 4, name: 'CCL', nameTh: 'CCL' },
];

// === Default Inventory (initial stock) ===
const DEFAULT_INVENTORY: InventoryItem[] = [
    { productId: 1, stockFull: 50, stockEmpty: 0, stockRepair: 0 },
    { productId: 2, stockFull: 50, stockEmpty: 0, stockRepair: 0 },
    { productId: 3, stockFull: 100, stockEmpty: 0, stockRepair: 0 },
];

// === Default Asset Debts (all zero) ===
const DEFAULT_DEBTS: AssetDebt[] = CUSTOMERS.flatMap((c) =>
    PRODUCTS.map((p) => ({ customerId: c.id, productId: p.id, activeDebt: 0 }))
);

// === Storage Keys ===
const KEYS = {
    inventory: 'progas_inventory',
    debts: 'progas_debts',
    transactions: 'progas_transactions',
};

// === Helpers ===
function load<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function save<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
}

// === Inventory CRUD ===
export function getInventory(): InventoryItem[] {
    return load(KEYS.inventory, DEFAULT_INVENTORY);
}

export function updateInventory(inv: InventoryItem[]): void {
    save(KEYS.inventory, inv);
}

// === Asset Debts CRUD ===
export function getDebts(): AssetDebt[] {
    return load(KEYS.debts, DEFAULT_DEBTS);
}

export function updateDebts(debts: AssetDebt[]): void {
    save(KEYS.debts, debts);
}

// === Transactions CRUD ===
export function getTransactions(): Transaction[] {
    return load(KEYS.transactions, []);
}

export function addTransaction(tx: Transaction): void {
    const txs = getTransactions();
    txs.unshift(tx);
    save(KEYS.transactions, txs);
}

// === Business Logic: Delivery ===
export function processDelivery(
    customerId: number,
    items: { productId: number; quantity: number }[],
    photo: string,
    signature: string,
    gpsLat?: number,
    gpsLng?: number
): Transaction {
    const inv = getInventory();
    const debts = getDebts();

    for (const item of items) {
        const invItem = inv.find((i) => i.productId === item.productId);
        if (invItem) {
            invItem.stockFull = Math.max(0, invItem.stockFull - item.quantity);
        }
        let debt = debts.find(
            (d) => d.customerId === customerId && d.productId === item.productId
        );
        if (!debt) {
            debt = { customerId, productId: item.productId, activeDebt: 0 };
            debts.push(debt);
        }
        debt.activeDebt += item.quantity;
    }

    updateInventory(inv);
    updateDebts(debts);

    const tx: Transaction = {
        id: crypto.randomUUID(),
        type: 'delivery',
        customerId,
        items: items.map((i) => ({ ...i })),
        photoUrl: photo,
        signatureUrl: signature,
        gpsLat,
        gpsLng,
        createdAt: new Date().toISOString(),
    };

    addTransaction(tx);
    return tx;
}

// === Business Logic: Return ===
export function processReturn(
    customerId: number,
    items: { productId: number; quantity: number; isDamaged: boolean }[],
    photo?: string
): Transaction {
    const inv = getInventory();
    const debts = getDebts();

    for (const item of items) {
        const debt = debts.find(
            (d) => d.customerId === customerId && d.productId === item.productId
        );
        if (debt) {
            debt.activeDebt = Math.max(0, debt.activeDebt - item.quantity);
        }
        const invItem = inv.find((i) => i.productId === item.productId);
        if (invItem) {
            if (item.isDamaged) {
                invItem.stockRepair += item.quantity;
            } else {
                invItem.stockEmpty += item.quantity;
            }
        }
    }

    updateInventory(inv);
    updateDebts(debts);

    const tx: Transaction = {
        id: crypto.randomUUID(),
        type: 'return',
        customerId,
        items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            isDamaged: i.isDamaged,
        })),
        photoUrl: photo,
        createdAt: new Date().toISOString(),
    };

    addTransaction(tx);
    return tx;
}

// === Dashboard Helpers ===
export function getAssetMatrix() {
    const debts = getDebts();
    return CUSTOMERS.map((c) => {
        const customerDebts = debts
            .filter((d) => d.customerId === c.id && d.activeDebt > 0)
            .map((d) => ({
                product: PRODUCTS.find((p) => p.id === d.productId)!,
                quantity: d.activeDebt,
            }));
        return {
            customer: c,
            debts: customerDebts,
            total: customerDebts.reduce((sum, d) => sum + d.quantity, 0),
        };
    });
}

export function getStockSummary() {
    const inv = getInventory();
    return PRODUCTS.map((p) => {
        const item = inv.find((i) => i.productId === p.id) || {
            stockFull: 0, stockEmpty: 0, stockRepair: 0,
        };
        return {
            product: p,
            full: item.stockFull,
            empty: item.stockEmpty,
            repair: item.stockRepair,
            isLow: item.stockFull <= 5,
        };
    });
}

export function generateReceiptData(tx: Transaction) {
    const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
    const itemDetails = tx.items.map((item) => {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        return { name: product?.nameTh || 'Unknown', quantity: item.quantity, unit: product?.unit || '' };
    });
    const date = new Date(tx.createdAt);
    const dateStr = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const mapsLink = tx.gpsLat && tx.gpsLng ? `https://www.google.com/maps?q=${tx.gpsLat},${tx.gpsLng}` : null;
    return { date: dateStr, customer: customer?.nameTh || 'Unknown', items: itemDetails, mapsLink, signature: tx.signatureUrl, photo: tx.photoUrl };
}

export function resetAllData(): void {
    save(KEYS.inventory, DEFAULT_INVENTORY);
    save(KEYS.debts, DEFAULT_DEBTS);
    save(KEYS.transactions, []);
}
