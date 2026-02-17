// ============================================
// Pro Gas Management — Data Store
// Supabase-powered persistence
// ============================================

import { supabase } from './supabase';

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
    { id: 1, name: 'Oxygen Pack 16', nameTh: 'ลมแพค 16', unit: 'ชุด', icon: '🔵' },
    { id: 2, name: 'Oxygen Pack 12', nameTh: 'ลมแพค 12', unit: 'ชุด', icon: '🟢' },
    { id: 3, name: 'LPG 15kg', nameTh: 'แก๊ส 15 กก.', unit: 'ถัง', icon: '🔴' },
];

export const CUSTOMERS: Customer[] = [
    { id: 1, name: 'Chang Pu', nameTh: 'ช่างปู' },
    { id: 2, name: 'Chang Eed', nameTh: 'ช่างอี๊ด' },
    { id: 3, name: 'Chang Pol', nameTh: 'ช่างพล' },
    { id: 4, name: 'CCL', nameTh: 'CCL' },
];

// === Default Inventory (fallback) ===
const DEFAULT_INVENTORY: InventoryItem[] = [
    { productId: 1, stockFull: 50, stockEmpty: 0, stockRepair: 0 },
    { productId: 2, stockFull: 50, stockEmpty: 0, stockRepair: 0 },
    { productId: 3, stockFull: 100, stockEmpty: 0, stockRepair: 0 },
];

const DEFAULT_DEBTS: AssetDebt[] = CUSTOMERS.flatMap((c) =>
    PRODUCTS.map((p) => ({ customerId: c.id, productId: p.id, activeDebt: 0 }))
);

// === Inventory ===
export async function getInventory(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
        .from('inventory')
        .select('product_id, stock_full, stock_empty, stock_repair');

    if (error || !data || data.length === 0) {
        console.error('getInventory error:', error);
        return DEFAULT_INVENTORY;
    }

    return data.map((row) => ({
        productId: row.product_id,
        stockFull: row.stock_full,
        stockEmpty: row.stock_empty,
        stockRepair: row.stock_repair,
    }));
}

export async function updateInventory(inv: InventoryItem[]): Promise<void> {
    for (const item of inv) {
        await supabase
            .from('inventory')
            .update({
                stock_full: item.stockFull,
                stock_empty: item.stockEmpty,
                stock_repair: item.stockRepair,
                updated_at: new Date().toISOString(),
            })
            .eq('product_id', item.productId);
    }
}

// === Asset Debts ===
export async function getDebts(): Promise<AssetDebt[]> {
    const { data, error } = await supabase
        .from('asset_debts')
        .select('customer_id, product_id, active_debt');

    if (error || !data || data.length === 0) {
        console.error('getDebts error:', error);
        return DEFAULT_DEBTS;
    }

    return data.map((row) => ({
        customerId: row.customer_id,
        productId: row.product_id,
        activeDebt: row.active_debt,
    }));
}

export async function updateDebts(debts: AssetDebt[]): Promise<void> {
    for (const debt of debts) {
        await supabase
            .from('asset_debts')
            .update({
                active_debt: debt.activeDebt,
                updated_at: new Date().toISOString(),
            })
            .eq('customer_id', debt.customerId)
            .eq('product_id', debt.productId);
    }
}

// === Transactions ===
export async function getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error || !data) {
        console.error('getTransactions error:', error);
        return [];
    }

    return data.map((row) => ({
        id: row.id,
        type: row.type,
        customerId: row.customer_id,
        items: row.items,
        photoUrl: row.photo_url || undefined,
        signatureUrl: row.signature_url || undefined,
        gpsLat: row.gps_lat || undefined,
        gpsLng: row.gps_lng || undefined,
        notes: row.notes || undefined,
        createdAt: row.created_at,
    }));
}

export async function addTransaction(tx: Transaction): Promise<void> {
    const { error } = await supabase.from('transactions').insert({
        id: tx.id,
        type: tx.type,
        customer_id: tx.customerId,
        items: tx.items,
        photo_url: tx.photoUrl || null,
        signature_url: tx.signatureUrl || null,
        gps_lat: tx.gpsLat || null,
        gps_lng: tx.gpsLng || null,
        notes: tx.notes || null,
        created_at: tx.createdAt,
    });

    if (error) {
        console.error('addTransaction error:', error);
    }
}

// === Business Logic: Delivery ===
export async function processDelivery(
    customerId: number,
    items: { productId: number; quantity: number }[],
    photo: string,
    signature: string,
    gpsLat?: number,
    gpsLng?: number
): Promise<Transaction> {
    const inv = await getInventory();
    const debts = await getDebts();

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

    await updateInventory(inv);
    await updateDebts(debts);

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

    await addTransaction(tx);
    return tx;
}

// === Business Logic: Return ===
export async function processReturn(
    customerId: number,
    items: { productId: number; quantity: number; isDamaged: boolean }[],
    photo?: string
): Promise<Transaction> {
    const inv = await getInventory();
    const debts = await getDebts();

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

    await updateInventory(inv);
    await updateDebts(debts);

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

    await addTransaction(tx);
    return tx;
}

// === Dashboard Helpers ===
export async function getAssetMatrix(): Promise<{
    customer: Customer;
    debts: { product: Product; quantity: number }[];
    total: number;
}[]> {
    const debts = await getDebts();
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

export async function getStockSummary(): Promise<{
    product: Product;
    full: number;
    empty: number;
    repair: number;
    isLow: boolean;
}[]> {
    const inv = await getInventory();
    return PRODUCTS.map((p) => {
        const item = inv.find((i) => i.productId === p.id) || {
            stockFull: 0,
            stockEmpty: 0,
            stockRepair: 0,
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

// === Generate receipt data for LINE ===
export function generateReceiptData(tx: Transaction) {
    const customer = CUSTOMERS.find((c) => c.id === tx.customerId);
    const itemDetails = tx.items.map((item) => {
        const product = PRODUCTS.find((p) => p.id === item.productId);
        return {
            name: product?.nameTh || 'Unknown',
            quantity: item.quantity,
            unit: product?.unit || '',
        };
    });

    const date = new Date(tx.createdAt);
    const dateStr = date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const mapsLink =
        tx.gpsLat && tx.gpsLng
            ? `https://www.google.com/maps?q=${tx.gpsLat},${tx.gpsLng}`
            : null;

    return {
        date: dateStr,
        customer: customer?.nameTh || 'Unknown',
        items: itemDetails,
        mapsLink,
        signature: tx.signatureUrl,
        photo: tx.photoUrl,
    };
}

// === Reset all data ===
export async function resetAllData(): Promise<void> {
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('asset_debts').delete().neq('id', 0);
    await supabase.from('inventory').delete().neq('id', 0);

    // Re-seed
    await supabase.from('inventory').insert([
        { product_id: 1, stock_full: 50, stock_empty: 0, stock_repair: 0 },
        { product_id: 2, stock_full: 50, stock_empty: 0, stock_repair: 0 },
        { product_id: 3, stock_full: 100, stock_empty: 0, stock_repair: 0 },
    ]);

    const debtSeeds = CUSTOMERS.flatMap((c) =>
        PRODUCTS.map((p) => ({
            customer_id: c.id,
            product_id: p.id,
            active_debt: 0,
        }))
    );
    await supabase.from('asset_debts').insert(debtSeeds);
}
