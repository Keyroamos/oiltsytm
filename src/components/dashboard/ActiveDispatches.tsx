import { useEffect, useState } from 'react';
import { Users, Truck, FileText, ShieldCheck, ArrowRight, Loader2, Navigation, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // Adjust this path if your Supabase client is located elsewhere

interface DispatchItem {
  id: string;
  driverName: string;
  plateNumber: string;
  load: string;
  passcardNumber: string;
  currentRoute: string;
  transitStatus: string;
}

export function ActiveDispatches() {
  const [dispatchList, setDispatchList] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveDispatches() {
      try {
        setLoading(true);
        // Query your database table (adjust table & column names to match your schema)
        const { data, error } = await supabase
          .from('dispatches') // Or 'orders' / 'fleet_allocations' based on your schema
          .select(`
            id,
            driver_name,
            plate_number,
            load_description,
            passcard_number,
            current_route,
            transit_status,
            status
          `)
          .eq('status', 'Active')
          .limit(5);

        if (error) throw error;

        if (data) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            driverName: item.driver_name || 'Unassigned',
            plateNumber: item.plate_number || 'N/A',
            load: item.load_description || 'Standard Fuel Load',
            passcardNumber: item.passcard_number || 'Pending',
            currentRoute: item.current_route || 'Depot Terminal → Main Highway',
            transitStatus: item.transit_status || 'En Route',
          }));
          setDispatchList(formatted);
        }
      } catch (err) {
        console.error('Error fetching active dispatches from database:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveDispatches();

    // Real-time listener to sync live database changes instantly
    const subscription = supabase
      .channel('public:dispatches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatches' }, () => {
        fetchActiveDispatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Active Driver Dispatches & Routing</h3>
              <p className="text-xs text-gray-500 mt-0.5">Live database sync for personnel, loads, and route transit</p>
            </div>
          </div>
          <Link to="/dispatches" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs">Loading live fleet data...</span>
          </div>
        ) : dispatchList.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-gray-400">
            <p className="text-xs font-semibold text-gray-700">No Active Dispatches Found</p>
            <p className="text-[11px] text-gray-400 mt-1">Check your database table or add a new dispatch record.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dispatchList.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex flex-col gap-2.5">
                {/* Top Row: Truck, Driver, and Passcard */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-bold text-gray-800">{item.plateNumber}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs font-medium text-gray-700">{item.driverName}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Pass: {item.passcardNumber}</span>
                  </div>
                </div>
                
                {/* Middle Row: Load Description */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-white p-2 rounded border border-gray-100">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Load: <strong className="text-gray-700">{item.load}</strong></span>
                </div>

                {/* Bottom Row: Theoretical Route Tracking & Transit State */}
                <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-200/60">
                  <div className="flex items-center gap-1.5 truncate">
                    <Navigation className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">Route: <span className="text-gray-700 font-medium">{item.currentRoute}</span></span>
                  </div>
                  <div className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-medium shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span>{item.transitStatus}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
