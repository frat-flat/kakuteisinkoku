import { useState, useCallback, useRef } from 'react';

// zengin-code のパブリックAPIを利用
const BANK_API_BASE = "https://zengin-code.github.io/api/banks.json";
const BRANCH_API_BASE = (bankCode: string) => `https://zengin-code.github.io/api/branches/${bankCode}.json`;

export function useBankApi() {
    const [banks, setBanks] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [isLoadingBranches, setIsLoadingBranches] = useState(false);

    // キャッシュを保持して複数回のリクエストを防ぐ
    const allBanksCache = useRef<any[] | null>(null);
    const branchCache = useRef<Record<string, any[]>>({});

    const fetchAllBanks = async () => {
        if (allBanksCache.current) return allBanksCache.current;
        const res = await fetch(BANK_API_BASE);
        if (!res.ok) throw new Error("API取得エラー");
        const data = await res.json();
        const banksArray = Object.values(data).map((bank: any) => {
            let n = bank.name;
            n = n.replace(/信金$/, '信用金庫');
            n = n.replace(/信組$/, '信用組合');
            n = n.replace(/農協$/, '農業協同組合');

            // "銀行" が省略されている場合の対応
            if (!/(銀行|金庫|組合|ろうきん|連合会|公庫|機構|事業団)$/.test(n)) {
                if (n.endsWith('信託')) {
                    n = n + '銀行';
                } else {
                    n = n + '銀行';
                }
            }
            return {
                ...bank,
                name: n
            };
        });
        allBanksCache.current = banksArray;
        return banksArray;
    };

    const fetchBranches = async (bankCode: string) => {
        if (branchCache.current[bankCode]) return branchCache.current[bankCode];
        const res = await fetch(BRANCH_API_BASE(bankCode));
        if (!res.ok) throw new Error("支店API取得エラー");
        const data = await res.json();
        const branchesArray = Object.values(data).map((branch: any) => {
            let n = branch.name;
            // ゆうちょ銀行(9900)で漢数字のみの支店名には「店」を付加する
            if (bankCode === '9900' && /^[〇一二三四五六七八九]+$/.test(n)) {
                n = n + '店';
            }
            return { ...branch, name: n };
        });
        branchCache.current[bankCode] = branchesArray;
        return branchesArray;
    };

    // 銀行の検索 (カナ、漢字、コードの一部など)
    const searchBanks = useCallback(async (query: string) => {
        if (!query) {
            setBanks([]);
            return;
        }
        setIsLoadingBanks(true);
        // "銀行" などのサフィックスを無視して柔軟に検索
        const normalizedQuery = query.replace(/(銀行|信用金庫|信用組合|農協|農業協同組合)$/, '');
        try {
            const banksArray = await fetchAllBanks();
            const filtered = banksArray.filter((b: any) =>
                b.name.includes(normalizedQuery) ||
                b.kana.includes(normalizedQuery) ||
                b.code.includes(normalizedQuery)
            ).slice(0, 20); // 最大20件
            setBanks(filtered);
        } catch (err) {
            console.error(err);
            setBanks([]);
        } finally {
            setIsLoadingBanks(false);
        }
    }, []);

    // 銀行コードによる正確な取得
    const getBankByCode = useCallback(async (code: string) => {
        try {
            const banksArray = await fetchAllBanks();
            return banksArray.find((b: any) => b.code === code) || null;
        } catch (e) { return null; }
    }, []);

    // 支店の検索
    const searchBranches = useCallback(async (bankCode: string, query: string) => {
        if (!bankCode || !query) {
            setBranches([]);
            return;
        }
        setIsLoadingBranches(true);
        // 「支店」「店」などのサフィックスを無視して検索
        const normalizedQuery = query.replace(/(支店|店)$/, '');
        try {
            const branchesArray = await fetchBranches(bankCode);
            const filtered = branchesArray.filter((b: any) =>
                b.name.includes(normalizedQuery) ||
                b.kana.includes(normalizedQuery) ||
                b.code.includes(normalizedQuery)
            ).slice(0, 20);
            setBranches(filtered);
        } catch (err) {
            console.error(err);
            setBranches([]);
        } finally {
            setIsLoadingBranches(false);
        }
    }, []);

    // 支店コードによる正確な取得
    const getBranchByCode = useCallback(async (bankCode: string, branchCode: string) => {
        if (!bankCode) return null;
        try {
            const branchesArray = await fetchBranches(bankCode);
            return branchesArray.find((b: any) => b.code === branchCode) || null;
        } catch (e) { return null; }
    }, []);

    const clearBanks = () => setBanks([]);
    const clearBranches = () => setBranches([]);

    return {
        banks,
        branches,
        isLoadingBanks,
        isLoadingBranches,
        searchBanks,
        searchBranches,
        getBankByCode,
        getBranchByCode,
        clearBanks,
        clearBranches
    };
}
