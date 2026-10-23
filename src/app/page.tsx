'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  CirclePlus, Tag, BarChart3, MessageCircle, Save, Settings, Trash2, Package, X, Send, Layers, Plus, Minus, ClipboardList
} from 'lucide-react'

const FRUITS = [
  { name: 'Dragon (West)', emoji: '🐉', type: 'Normal' },
  { name: 'Dragon (East)', emoji: '🐲', type: 'Normal' },
  { name: 'Kitsune', emoji: '🦊', type: 'Normal' },
  { name: 'Magnet', emoji: '🧲', type: 'Normal' },
  { name: 'Meme', emoji: '😂', type: 'Normal' },
  { name: 'Ember Dragon (West)', emoji: '🔥', type: 'Skin' },
  { name: 'Crimson Kitsune', emoji: '🦊', type: 'Skin' },
  { name: 'Arcsteel Magnet', emoji: '🧲', type: 'Skin' },
  { name: 'Starlight Gravity', emoji: '⭐', type: 'Skin' },
  { name: 'Runic Fiend', emoji: '😈', type: 'Skin' },
  { name: 'Purple Lightning', emoji: '🟣', type: 'Skin' },
  { name: 'Yellow Lightning', emoji: '⚡', type: 'Skin' },
  { name: 'Red Lightning', emoji: '🔴', type: 'Skin' },
  { name: 'Lime Blade', emoji: '🟢', type: 'Skin' },
  { name: 'Scarlet Ghost', emoji: '👻', type: 'Skin' },
  { name: 'Dog Blade', emoji: '🗡️', type: 'Skin' },
  { name: 'Rabid', emoji: '🐀', type: 'Skin' },
  { name: 'Doghouse (Frame Break)', emoji: '🏠', type: 'Skin' },
  { name: 'Vibes (Frame Break)', emoji: '🎵', type: 'Skin' },
  { name: 'Divine Portal', emoji: '🌟', type: 'Skin' },
  { name: 'Galaxy Empyrean Kitsune', emoji: '🌌', type: 'Skin' },
  { name: 'Premium', emoji: '💎', type: 'Skin' },
  { name: 'Werewolf (Tiger)', emoji: '🐺', type: 'Mutated' },
  { name: 'Fiend (Yeti)', emoji: '😈', type: 'Mutated' },
  { name: 'Empyrean (Kitsune)', emoji: '🌟', type: 'Mutated' },
]

interface Stock { id: number; item_name: string; price: number; quantity: number; created_at?: string; }
interface CartItem { tempId: string; stockId: number; item_name: string; price: number; quantity: number; maxStock: number; }

const peso = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Home() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  
  const [fruitType, setFruitType] = useState('Normal')
  const [itemName, setItemName] = useState('Dragon (West)')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(false)

  const [embedTitle, setEmbedTitle] = useState('SOLD!!') // Default na SOLD!!
  const [inventoryTitle, setInventoryTitle] = useState('STOCKS AVAILABLE NOW!')

  const filteredFruits = FRUITS.filter(f => f.type === fruitType)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('webhookUrl')
      if (saved) setWebhookUrl(saved)
    } catch {}
    fetchStocks()
  }, [])

  useEffect(() => {
    if (filteredFruits.length > 0) setItemName(filteredFruits[0].name)
  }, [fruitType])

  async function fetchStocks() {
    const { data } = await supabase.from('stocks').select('*').order('created_at', { ascending: false })
    if (data) setStocks(data as Stock[])
  }

  async function handleAddNewStock(e: React.FormEvent) {
    e.preventDefault()
    const p = parseFloat(price)
    const q = parseInt(quantity || '1', 10)
    if (!itemName.trim() || isNaN(p) || isNaN(q)) return alert('Please fill in the fields.')
    
    setLoading(true)
    const { error } = await supabase.from('stocks').insert([{ item_name: itemName.trim(), price: p, quantity: q }])
    if (error) { alert('Error: ' + error.message); setLoading(false); return }
    
    await fetchStocks()
    setPrice(''); setQuantity('')
    setLoading(false)
  }

  async function updateQuantity(id: number, currentQty: number, change: number) {
    const newQty = currentQty + change
    if (newQty < 0) return
    const { error } = await supabase.from('stocks').update({ quantity: newQty }).eq('id', id)
    if (error) return alert('Error: ' + error.message)
    fetchStocks()
  }

  function addToCart(stock: Stock) {
    const existing = cart.find(c => c.stockId === stock.id)
    if (existing) {
      if (existing.quantity >= stock.quantity) return alert("Not enough stock.")
      setCart(cart.map(c => c.stockId === stock.id ? { ...c, quantity: c.quantity + 1 } : c))
    } else {
      if (stock.quantity <= 0) return alert("Out of stock.")
      setCart([...cart, { tempId: Date.now().toString(), stockId: stock.id, item_name: stock.item_name, price: stock.price, quantity: 1, maxStock: stock.quantity }])
    }
  }

  function updateCartQty(tempId: string, change: number) {
    setCart(cart.map(c => {
      if (c.tempId === tempId) {
        const newQ = c.quantity + change
        if (newQ < 1) return c
        if (newQ > c.maxStock) { alert("Not enough stock in database."); return c }
        return { ...c, quantity: newQ }
      }
      return c
    }))
  }

  function removeFromCart(tempId: string) { setCart(cart.filter(item => item.tempId !== tempId)) }

  // FUNCTION PARA SA PAG-SEND NG RECEIPT (BINENTA - YELLOW & SOLD!!)
  async function handleSellStocks() {
    if (cart.length === 0) return alert("The list is empty.")
    if (!webhookUrl.trim()) return alert("Webhook URL is required.")

    setLoading(true)
    try {
      try { localStorage.setItem('webhookUrl', webhookUrl) } catch {}

      // 1. Deduct sa database
      for (const item of cart) {
        const stockData = stocks.find(s => s.id === item.stockId)
        if (!stockData) continue
        const { error } = await supabase.from('stocks').update({ quantity: stockData.quantity - item.quantity }).eq('id', item.stockId)
        if (error) throw new Error(error.message)
      }

      await fetchStocks()

      // 2. Send sa Discord (Yellow Color)
      let totalPrice = 0
      const formattedItems = cart.map((s) => {
        const fruitData = FRUITS.find(f => f.name === s.item_name)
        totalPrice += s.price * s.quantity
        return `${peso(s.price)} ${fruitData?.emoji || '❓'} ${s.item_name} - ${s.quantity}x`
      }).join('\n')

      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webhookUrl: webhookUrl.trim(), 
          items: formattedItems, 
          total: peso(totalPrice), 
          title: embedTitle, // Galing sa input, default ay SOLD!!
          color: 16776960 // YELLOW COLOR CODE SA DISCORD
        }),
      })

      setCart([])
      alert("Success! Receipt sent and stocks deducted.")
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // FUNCTION PARA SA INVENTORY (GREEN PA RIN)
  async function handleSendInventory() {
    if (!webhookUrl.trim()) return alert("Webhook URL is required.")
    if (stocks.length === 0) return alert("No stocks to send.")

    setLoadingInventory(true)
    try {
      let totalPrice = 0
      const availableStocks = stocks.filter(s => s.quantity > 0)
      
      const formattedItems = availableStocks.map((s) => {
        const fruitData = FRUITS.find(f => f.name === s.item_name)
        totalPrice += s.price * s.quantity
        return `${peso(s.price)} ${fruitData?.emoji || '❓'} ${s.item_name} - ${s.quantity}x`
      }).join('\n')

      if (!formattedItems) return alert("No available stocks to promote.")

      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          webhookUrl: webhookUrl.trim(), 
          items: formattedItems, 
          total: peso(totalPrice), 
          title: inventoryTitle,
          color: 65280 // GREEN COLOR CODE PARA SA INVENTORY
        }),
      })
      alert("Inventory sent to Discord!")
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    } finally {
      setLoadingInventory(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this item from database?')) return
    await supabase.from('stocks').delete().eq('id', id)
    fetchStocks()
  }

  const totalCartPrice = cart.reduce((s, x) => s + (x.price * x.quantity), 0)

  const inputWrap = 'flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
  const iconBox = 'flex h-9 w-9 shrink-0 items-center justify-center border-r border-gray-200 bg-gray-100 text-gray-500'
  const input = 'h-9 w-full bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none'

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900" style={{ backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '44px 44px' }}>
      
      <h1 className="mb-8 text-center text-3xl font-extrabold tracking-wide text-gray-500">SUPPLIER MONITOR</h1>

      <div className="mx-auto grid max-w-5xl items-start gap-5 md:grid-cols-2">
        
        <div className="flex flex-col gap-4">
          <form onSubmit={handleAddNewStock} className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CirclePlus size={20} /> Add New Supply</h2>
            <label className="mb-1 block text-sm font-medium">Fruit Type</label>
            <div className={`${inputWrap} mb-3`}>
              <span className={iconBox}><Layers size={16} /></span>
              <select className={input} value={fruitType} onChange={(e) => setFruitType(e.target.value)}>
                <option value="Normal">Normal Fruits</option>
                <option value="Skin">Skins</option>
                <option value="Mutated">Mutated</option>
              </select>
            </div>
            <label className="mb-1 block text-sm font-medium">Select Fruit</label>
            <div className={`${inputWrap} mb-3`}>
              <span className={iconBox}><Tag size={16} /></span>
              <select className={input} value={itemName} onChange={(e) => setItemName(e.target.value)}>
                {filteredFruits.map((f) => <option key={f.name} value={f.name}>{f.emoji} {f.name}</option>)}
              </select>
            </div>
            <label className="mb-1 block text-sm font-medium">Cost Price</label>
            <div className={`${inputWrap} mb-3`}>
              <span className={`${iconBox} text-sm font-semibold`}>₱</span>
              <input className={input} type="number" min="0" step="any" placeholder="e.g. 120" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <label className="mb-1 block text-sm font-medium">Quantity</label>
            <div className={`${inputWrap} mb-4`}>
              <span className={iconBox}><BarChart3 size={16} /></span>
              <input className={input} type="number" min="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
              <Save size={16} /> Add Supply
            </button>
          </form>

          <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <h2 className="mb-4 text-lg font-bold flex justify-between items-center">
              <span>Sold Items</span>
              <span className="text-blue-600">{peso(totalCartPrice)}</span>
            </h2>
            {cart.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No items selected.</p>
            ) : (
              <ul className="flex flex-col gap-2 mb-4 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const fruitData = FRUITS.find(f => f.name === item.item_name)
                  return (
                    <li key={item.tempId} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 border border-gray-100">
                      <span className="text-xl">{fruitData?.emoji || '❓'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{peso(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-1">
                        <button onClick={() => updateCartQty(item.tempId, -1)} className="text-gray-500 hover:text-blue-600 p-1"><Minus size={12} /></button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.tempId, 1)} className="text-gray-500 hover:text-blue-600 p-1"><Plus size={12} /></button>
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-16 text-right">{peso(item.price * item.quantity)}</span>
                      <button onClick={() => removeFromCart(item.tempId)} className="text-red-400 hover:text-red-600 p-1"><X size={16} /></button>
                    </li>
                  )
                })}
              </ul>
            )}

            <label className="mb-1 block text-sm font-medium mt-4">Receipt Title</label>
            <div className={`${inputWrap} mb-3`}>
              <span className={iconBox}><Settings size={16} /></span>
              <input className={input} placeholder="e.g. SOLD!!" value={embedTitle} onChange={(e) => setEmbedTitle(e.target.value)} />
            </div>

            <button onClick={handleSellStocks} disabled={loading || cart.length === 0} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-yellow-500 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-50">
              <Send size={18} /> {loading ? 'Sending...' : 'SEND RECEIPT & DEDUCT'}
            </button>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
          
          <label className="mb-1 block text-sm font-bold text-blue-600">Discord Webhook URL</label>
          <div className={`${inputWrap} mb-4`}>
            <span className={iconBox}><MessageCircle size={16} /></span>
            <input className={input} type="password" placeholder="Paste your Discord Webhook URL here..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Supplier Inventory</h2>
          </div>

          <label className="mb-1 block text-sm font-medium">Inventory Title (Discord)</label>
          <div className={`${inputWrap} mb-3`}>
            <span className={iconBox}><Settings size={16} /></span>
            <input className={input} placeholder="e.g. STOCKS AVAILABLE NOW!" value={inventoryTitle} onChange={(e) => setInventoryTitle(e.target.value)} />
          </div>

          <button onClick={handleSendInventory} disabled={loadingInventory} className="flex w-full items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition mb-4">
            <ClipboardList size={16} /> {loadingInventory ? 'Sending...' : 'Send Inventory to Discord'}
          </button>
          
          {stocks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-100 py-10 text-gray-500"><Package size={28} /><p className="text-sm">No records found.</p></div>
          ) : (
            <ul className="flex max-h-[500px] flex-col gap-3 overflow-y-auto pr-1">
              {stocks.map((s) => {
                const fruitData = FRUITS.find(f => f.name === s.item_name)
                return (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">{fruitData?.emoji || '❓'}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-blue-600">{s.item_name}</p>
                    <p className="text-xs text-gray-500">Cost: ₱{s.price}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-1">
                    <button onClick={() => updateQuantity(s.id, s.quantity, -1)} className="text-gray-500 hover:text-red-500 p-1" disabled={s.quantity <= 0}><Minus size={14} /></button>
                    <span className="text-sm font-bold w-6 text-center">{s.quantity}</span>
                    <button onClick={() => updateQuantity(s.id, s.quantity, 1)} className="text-gray-500 hover:text-green-500 p-1"><Plus size={14} /></button>
                  </div>

                  <button onClick={() => addToCart(s)} className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-md text-xs font-bold transition">Sell</button>
                  <button type="button" className="text-gray-400 hover:text-red-600 ml-1" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </li>
              )})}
            </ul>
          )}
        </section>

      </div>
    </main>
  )
}