
import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Star, 
  Share2, 
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const Store: React.FC = () => {
  const searchTerm = '';
  const [cartCount, setCartCount] = useState(0);

  const products = [
    { id: 1, name: 'Gorra Snapback Classic Black', category: 'Gorras', price: 12.50, stock: 45, rating: 4.8, image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=400' },
    { id: 2, name: 'Gorra Dad Hat Vintage Blue', category: 'Gorras', price: 10.00, stock: 120, rating: 4.5, image: 'https://images.unsplash.com/photo-1576850738893-9f933bc0b6fe?auto=format&fit=crop&q=80&w=400' },
    { id: 3, name: 'Repuesto Agujas Bordadoras x100', category: 'Repuestos', price: 45.00, stock: 15, rating: 4.9, image: 'https://images.unsplash.com/photo-1584281723351-933e14479901?auto=format&fit=crop&q=80&w=400' },
    { id: 4, name: 'Máquina Estampadora Manual Mini', category: 'Maquinaria', price: 350.00, stock: 8, rating: 4.2, image: 'https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&q=80&w=400' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold font-outfit">Tienda <span className="text-gradient">Interna</span></h2>
          <p className="text-slate-400 mt-2">Catálogo visual para venta rápida y selección de insumos.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass p-3 rounded-2xl flex items-center gap-3 border border-slate-800">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white relative">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-slate-900">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="pr-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider leading-tight">Tu Carrito</p>
              <p className="text-sm font-bold font-outfit">$0.00</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-5 rounded-3xl flex flex-col md:flex-row gap-6 items-center shadow-xl shadow-black/20">
        <div className="relative flex-1">
          <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar en el catálogo..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border-slate-800 focus:border-violet-500/50 rounded-2xl text-lg"
            value={searchTerm}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="btn-outline flex items-center justify-center gap-2 py-3 px-6 rounded-2xl w-full">
            <Filter size={20} />
            Categorías
          </button>
          <button className="btn-primary flex items-center justify-center gap-2 py-3 px-8 rounded-2xl w-full whitespace-nowrap">
            Generar Proforma
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <motion.div 
            key={product.id}
            whileHover={{ y: -10 }}
            className="glass group rounded-[2.5rem] overflow-hidden border border-slate-800/50 hover:border-violet-500/30 transition-all duration-500 shadow-xl shadow-black/10"
          >
            <div className="relative aspect-square overflow-hidden bg-slate-900">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                  {product.category}
                </span>
                {product.stock < 20 && (
                  <span className="px-3 py-1 bg-rose-500/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                    Stock Bajo
                  </span>
                )}
              </div>
              <button className="absolute top-4 right-4 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-violet-600 transition-all duration-300">
                <Star size={18} />
              </button>
              
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-lg leading-tight group-hover:text-violet-400 transition-colors">{product.name}</h3>
                <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  <Star size={12} fill="currentColor" />
                  <span className="text-xs font-bold">{product.rating}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Precio Unit.</span>
                  <span className="text-2xl font-bold font-outfit text-white">${product.price.toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Disponible</span>
                  <span className="text-sm font-medium text-slate-300">{product.stock} Unid.</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setCartCount(c => c + 1)}
                  className="flex-1 btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <ShoppingCart size={18} className="relative z-10" />
                  <span className="relative z-10">Añadir</span>
                </button>
                <button className="p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:border-slate-700 transition-all">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Store;
