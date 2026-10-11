import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, User, Phone, Check, X } from 'lucide-react';
import { getActiveDrivers } from '../../services/driverService';
import type { Driver } from '../../types';
import { cn } from '../../utils/cn';

interface DriverComboboxProps {
  value: string;
  onChange: (driverName: string, driverPhone?: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function DriverCombobox({
  value,
  onChange,
  label = 'Assigned Driver',
  placeholder = 'Select or search driver...',
  required = false,
  className,
}: DriverComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing drivers from database drivers registry
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const list = await getActiveDrivers();
        if (!mounted) return;
        setDrivers(list);
      } catch (err) {
        console.error('Failed to load drivers for combobox:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered drivers based on search input
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.license_number && d.license_number.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q))
    );
  });

  const handleSelect = (driver: Driver) => {
    onChange(driver.name, driver.phone || undefined);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {value && (
            <span className="text-[10px] text-emerald-600 font-medium">Selected</span>
          )}
        </div>
      )}

      {/* Main Combobox Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <User className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : value}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            // Also allow manual typing as custom driver
            onChange(e.target.value);
          }}
          onFocus={() => {
            setSearchQuery(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] bg-white transition-all shadow-sm"
        />

        {/* Action icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen ? 'rotate-180 text-[#1e3a5f]' : ''
              )}
            />
          </button>
        </div>
      </div>

      {/* Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-64 flex flex-col">
          {/* Search Header when opened */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="Search driver by name, phone, or role..."
              className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onChange('');
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List of Drivers */}
          <div className="overflow-y-auto divide-y divide-gray-50 p-1 flex-1">
            {loading ? (
              <div className="py-6 text-center text-xs text-gray-400">Loading system drivers...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="py-4 px-3 text-center">
                <p className="text-xs font-semibold text-gray-700">No matching system driver</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  "{searchQuery}" will be recorded as an external/custom driver.
                </p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = value.trim().toLowerCase() === driver.name.trim().toLowerCase();

                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => handleSelect(driver)}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors text-xs',
                      isSelected
                        ? 'bg-amber-50/80 text-amber-950 font-semibold'
                        : 'hover:bg-gray-50 text-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-amber-100 text-amber-700">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 truncate">
                            {driver.name}
                          </span>
                          {driver.license_number && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                              {driver.license_number}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                          {driver.phone ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {driver.phone}
                            </span>
                          ) : (
                            <span className="italic text-[10px] text-gray-400">No phone listed</span>
                          )}
                          {driver.notes && (
                            <span className="truncate hidden sm:inline text-gray-400">
                              {driver.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
