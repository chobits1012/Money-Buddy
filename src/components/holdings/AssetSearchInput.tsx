import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/Input';
import type { StockAssetType } from '../../types';
import twStocks from '../../data/tw_stocks.json';

interface SearchResult {
    symbol: string;
    name: string;
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
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (type === 'TAIWAN_STOCK') {
                // Local search
                const lowerVal = value.toLowerCase();
                const matched = twStocks.filter((s: any) => 
                    s.symbol.includes(lowerVal) || s.name.toLowerCase().includes(lowerVal)
                ).slice(0, 10);
                // For Taiwan stock, suffix ".TW" could be added if needed for Yahoo quotes, 
                // but we will save symbol precisely in the store on selection.
                const formattedMatched = matched.map((s: any) => ({
                    ...s,
                    // If we use Yahoo API later for quotes, typical TWSE stocks need .TW or .TWO suffix. 
                    // Let's attach .TW if length is 4 and fully numeric as a general heuristic, 
                    // or just let api/quote handle it. We will just pass the raw symbol for now.
                    symbol: s.symbol,
                    exchDisp: 'TWSE'
                }));
                setResults(formattedMatched);
                setIsOpen(formattedMatched.length > 0);
            } else if (type === 'US_STOCK' || type === 'FUNDS') {
                // API search
                setLoading(true);
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const mapped = data.map((item: any) => ({
                            symbol: item.symbol,
                            name: item.shortname || item.longname || item.symbol,
                            exchDisp: item.exchDisp
                        }));
                        setResults(mapped);
                        setIsOpen(mapped.length > 0);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value, type, disabled]);

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
                    if (results.length > 0) setIsOpen(true);
                }}
                error={error}
                disabled={disabled}
                autoFocus
                icon={loading ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : undefined}
            />
            {isOpen && !disabled && value.trim().length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-stoneSoft rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {results.length > 0 ? results.map((res) => (
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
                                <span className="text-clay truncate max-w-[80%]">{res.name}</span>
                                {res.exchDisp && <span className="text-clay/60 text-[10px]">{res.exchDisp}</span>}
                            </div>
                        </button>
                    )) : !loading && (
                        <div className="px-4 py-3 text-sm text-clay/60">找不到相符的標的 (按確認將直接新增)</div>
                    )}
                </div>
            )}
        </div>
    );
};
