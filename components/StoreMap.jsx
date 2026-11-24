'use client';
// Подключать только через next/dynamic с ssr:false (Leaflet обращается к window).
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BISHKEK } from '@/lib/options';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function StoreMap({ stores = [], user, onPick, best, height = 380 }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    const m = L.map(el.current).setView([BISHKEK.lat, BISHKEK.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    m.on('click', (e) => pick.current && pick.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
    return () => m.remove();
  }, []);

  useEffect(() => {
    const g = layer.current; g.clearLayers();
    const pts = [];
    stores.filter((s) => s.lat != null && s.lng != null).forEach((s) => {
      const icon = L.divIcon({ className: '', html: `<div class="pin ${best === s.id ? 'best' : ''}" style="background:${esc(s.color || '#2fa84f')}">${esc(s.short || '●')}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      L.marker([s.lat, s.lng], { icon }).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address || '')}${s.label ? '<br>' + esc(s.label) : ''}`).addTo(g);
      pts.push([s.lat, s.lng]);
    });
    if (user) { L.circleMarker([user.lat, user.lng], { radius: 8, color: '#1c5fd1', fillOpacity: 0.9 }).bindPopup('Вы здесь').addTo(g); pts.push([user.lat, user.lng]); }
    if (pts.length > 1) map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
  }, [stores, user, best]);

  return <div ref={el} style={{ height, borderRadius: 16, zIndex: 0 }} />;
}
