import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '../ui/Input';
import type { StockAssetType } from '../../types';
import twStocks from '../../data/tw_stocks.json';
import funds from '../../data/funds.json';
import { usePortfolioStore } from '../../store/portfolioStore';
import { buildUserFundEntries, searchFunds, type FundCatalogEntry, type FundSearchResult } from '../../utils/fundCatalog';
import { cn } from '../../utils/cn';

interface SearchResult {
    symbol: string;
    name: string;
    exchDisp?: string;
}

interface TaiwanStockEntry {
    symbol: string;
    name: string;
}

interface ApiSearchItem {
    symbol: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
}

interface AssetSearchInputProps {
    type: StockAssetType;
    value: string;
    onChange: (value: string) => void;
    onSelect: (name: string, symbol: string) => void;
    error?: string;
    disabled?: boolean;
    placeholder?: string;
}

export const AssetSearchInput = ({
    type, value, onChange, onSelect, error, disabled, placeholder
}: AssetSearchInputProps) => {
    const holdings = usePortfolioStore((state) => state.holdings);
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [fundResults, setFundResults] = useState<FundSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fundCatalog = funds as FundCatalogEntry[];
    const userFundEntries = useMemo(
        () => buildUserFundEntries(
            holdings
                .filter((h) => !h.deletedAt && h.type === 'FUNDS')
                .map((h) => ({ name: h.name, symbol: h.symbol })),
        ),
        [holdings],
    );

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value.trim() || disabled) {
            setResults([]);
            setFundResults([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (type === 'TAIWAN_STOCK') {
                const lowerVal = value.toLowerCase();
                const matched = (twStocks as TaiwanStockEntry[]).filter((s) =>
                    s.symbol.includes(lowerVal) || s.name.toLowerCase().includes(lowerVal)
                ).slice(0, 10);
                const formattedMatched = matched.map((s) => ({
                    ...s,
                    symbol: s.symbol,
                    exchDisp: 'TWSE'
                }));
                setResults(formattedMatched);
                setFundResults([]);
                setIsOpen(formattedMatched.length > 0);
            } else if (type === 'FUNDS') {
                const matchedFunds = searchFunds(value, fundCatalog, userFundEntries, 12);
                setFundResults(matchedFunds);
                setResults([]);
                setIsOpen(matchedFunds.length > 0);
            } else if (type === 'US_STOCK') {
                setLoading(true);
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
                    if (res.ok) {
                        const data: ApiSearchItem[] = await res.json();
                        const mapped = data.map((item) => ({
                            symbol: item.symbol,
                            name: item.shortname || item.longname || item.symbol,
                            exchDisp: item.exchDisp
                        }));
                        setResults(mapped);
                        setFundResults([]);
                        setIsOpen(mapped.length > 0);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setFundResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value, type, disabled, fundCatalog, userFundEntries]);

    const hasDropdown = type === 'FUNDS' ? fundResults.length > 0 : results.length > 0;

    return (
        <div ref={containerRef} className="relative w-full">
            <Input
                label="標的名稱"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (hasDropdown) setIsOpen(true);
                }}
                error={error}
                disabled={disabled}
                autoFocus
                icon={loading ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : undefined}
            />
            {isOpen && !disabled && value.trim().length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-stoneSoft rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {type === 'FUNDS' ? (
                        fundResults.length > 0 ? fundResults.map((res) => (
                            <button
                                key={`${res.source}-${res.symbol}-${res.name}`}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-stoneSoft/20 flex flex-col transition-colors border-b border-stoneSoft/30 last:border-b-0"
                                onClick={() => {
                                    onSelect(res.name, res.symbol);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 text-sm truncate">{res.name}</span>
                                    {res.source === 'holding' && (
                                        <span className="text-[10px] font-medium text-rust bg-rust/10 px-1.5 py-0.5 rounded shrink-0">
                                            我的基金
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-xs mt-0.5">
                                    <span className="text-clay/70 truncate max-w-[80%]">{res.symbol}</span>
                                    {res.exchDisp && <span className="text-clay/60 text-[10px]">{res.exchDisp}</span>}
                                </div>
                            </button>
                        )) : !loading && (
                            <div className="px-4 py-3 text-sm text-clay/60">找不到相符的標的 (按確認將直接新增)</div>
                        )
                    ) : (
                        results.length > 0 ? results.map((res) => (
                            <button
                                key={res.symbol}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-stoneSoft/20 flex flex-col transition-colors border-b border-stoneSoft/30 last:border-b-0"
                                onClick={() => {
                                    onSelect(res.name, res.symbol);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="font-semibold text-slate-800 text-sm">{res.symbol}</span>
                                <div className="flex justify-between items-center text-xs mt-0.5">
                                    <span className={cn("text-clay truncate max-w-[80%]")}>{res.name}</span>
                                    {res.exchDisp && <span className="text-clay/60 text-[10px]">{res.exchDisp}</span>}
                                </div>
                            </button>
                        )) : !loading && (
                            <div className="px-4 py-3 text-sm text-clay/60">找不到相符的標的 (按確認將直接新增)</div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};
