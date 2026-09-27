'use client';

// ========================================
// 地図表示コンポーネント（Google Maps iOSアプリ風）
// ピンのデザインや操作感をGoogle Mapsに近づけている
// ========================================

import { useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import { Spot, getSpotConfig, getDayColor } from '../lib/types';

// ─── 定数 ───
// デフォルト: 日本中心
const DEFAULT_CENTER: L.LatLngExpression = [36.5, 137.5];
const DEFAULT_ZOOM = 6;

// MapViewの外部操作用ハンドル
export interface MapViewHandle {
  locateMe: () => void;
}

// Google Maps風タイル（日本語ラベル・高解像度Retina対応）
const TILE_URL =
  'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ja&scale=2';
const TILE_ATTRIBUTION =
  '&copy; Google Maps';

// ─── 型定義 ───
interface MapViewProps {
  spots: Spot[];
  selectedSpotId: string | null;
  onSpotSelect: (spotId: string) => void;
  /** マップの可視領域の高さ（vh単位）。ボトムシートの上だけ見えるので補正用 */
  visibleHeightVh?: number;
  /** spotId → 何日目 のマッピング（ピン表示用） */
  spotDayMap?: Record<string, number>;
}

// ========================================
// Google Maps風ピンアイコンの生成
// Google Mapsのピンは「丸い頭＋尖った下部」のドロップ型
// ========================================
function createGoogleStylePin(spot: Spot, isSelected: boolean): L.DivIcon {
  const config = getSpotConfig(spot.type);
  const scale = isSelected ? 1.3 : 1;
  const shadow = isSelected
    ? '0 4px 12px rgba(0,0,0,0.4)'
    : '0 2px 6px rgba(0,0,0,0.3)';

  // Google Maps風ドロップピンをSVGで描画
  const pinHtml = `
    <div style="
      transform: scale(${scale});
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(${shadow});
      cursor: pointer;
    ">
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- ピン本体（ドロップ型） -->
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 26 16 26s16-14 16-26C32 7.164 24.836 0 16 0z"
              fill="${config.color}" />
        <!-- 内側の白い円 -->
        <circle cx="16" cy="15" r="8" fill="white" opacity="0.95"/>
      </svg>
      <!-- アイコン（中央に配置） -->
      <div style="
        position: absolute;
        top: 6px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 14px;
        line-height: 20px;
      ">${config.icon}</div>
    </div>
  `;

  return L.divIcon({
    className: '', // Leafletデフォルトのスタイルを無効化
    html: pinHtml,
    iconSize: [32, 42],
    iconAnchor: [16, 42],    // ピンの先端を座標に合わせる
    popupAnchor: [0, -38],   // ポップアップをピンの上に表示
  });
}

// Google Maps風のピン（何日目かを表示、Day色で統一）
function createNumberedPin(spot: Spot, dayNum: number | undefined, isSelected: boolean): L.DivIcon {
  const dayColor = dayNum ? getDayColor(dayNum) : null;
  const pinColor = dayColor?.hex ?? getSpotConfig(spot.type).color;
  const scale = isSelected ? 1.3 : 1;
  const shadow = isSelected
    ? '0 4px 12px rgba(0,0,0,0.4)'
    : '0 2px 6px rgba(0,0,0,0.3)';

  const label = dayNum ?? '';

  const pinHtml = `
    <div style="
      transform: scale(${scale});
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(${shadow});
      cursor: pointer;
      position: relative;
    ">
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 26 16 26s16-14 16-26C32 7.164 24.836 0 16 0z"
              fill="${pinColor}" />
        <circle cx="16" cy="15" r="9" fill="white" opacity="0.95"/>
      </svg>
      <div style="
        position: absolute;
        top: 5px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        line-height: 20px;
        color: ${pinColor};
      ">${label}</div>
    </div>
  `;

  return L.divIcon({
    className: '',
    html: pinHtml,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

// ========================================
// 地図の表示範囲をスポットに合わせて自動調整
// 初回表示時にピンが全部見える範囲に自動ズーム
// ========================================
function FitBounds({ spots }: { spots: Spot[] }) {
  const map = useMap();
  const fittedRef = useRef(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const validSpots = spots.filter(
      (s): s is Spot & { lat: number; lng: number } => s.lat != null && s.lng != null
    );
    if (validSpots.length === 0) return;

    // 初回 or スポット数変更時にフィット
    if (!fittedRef.current || validSpots.length !== prevCountRef.current) {
      if (validSpots.length === 1) {
        map.setView([validSpots[0].lat, validSpots[0].lng], 14, { animate: true, duration: 0.5 });
      } else {
        const bounds = L.latLngBounds(validSpots.map(s => [s.lat, s.lng] as L.LatLngTuple));
        map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.5 });
      }
      fittedRef.current = true;
      prevCountRef.current = validSpots.length;
    }
  }, [spots, map]);

  return null;
}

// ========================================
// マップ操作コントローラー（refで外部から操作可能）
// ========================================
function MapController({
  controlRef,
  onLocate,
  visibleHeightVh,
}: {
  controlRef: React.MutableRefObject<{ locateMe: () => void } | null>;
  onLocate: (lat: number, lng: number) => void;
  visibleHeightVh: number;
}) {
  const map = useMap();

  useEffect(() => {
    controlRef.current = {
      locateMe: () => {
        if (!navigator.geolocation) {
          alert('このブラウザでは位置情報を取得できません');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            onLocate(latitude, longitude);

            // マップの見える部分の中央に来るようオフセット補正
            // 1. まず現在位置を一旦中央にセット（アニメなし）してピクセル座標を取得
            // 2. 見える領域の中央ピクセルを算出し、そこに対応する緯度経度を逆算
            // 3. 補正済み中心で setView する（1回だけ）
            map.setView([latitude, longitude], 15, { animate: false });

            const mapContainerH = map.getSize().y;
            const visibleH = (visibleHeightVh / 100) * window.innerHeight;
            // 見える領域の中央Y = visibleH / 2
            // マップコンテナ中央Y = mapContainerH / 2
            // ユーザー位置を visibleH/2 に置くには、地図中心を下にずらす
            const targetCenterY = mapContainerH / 2 + (mapContainerH / 2 - visibleH / 2);
            const targetCenterX = map.getSize().x / 2;
            const adjustedCenter = map.containerPointToLatLng([targetCenterX, targetCenterY]);

            map.setView(adjustedCenter, 15, { animate: true, duration: 0.5 });
          },
          () => {
            alert('位置情報を取得できませんでした。\n設定で位置情報の許可を確認してください。');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      },
    };
  }, [map, onLocate, controlRef, visibleHeightVh]);

  return null;
}

// ========================================
// PCトラックパッド: Google Maps風のスムーズ操作
// 2本指スワイプ → 地図移動（パン）
// ピンチイン/アウト → ズームイン/アウト
// ========================================
function TrackpadPanHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    // ズーム用の累積値（スムーズズーム）
    let zoomAccum = 0;
    let zoomRafId: number | null = null;
    let zoomCenter: L.LatLng | null = null;

    const applyZoom = () => {
      zoomRafId = null;
      if (Math.abs(zoomAccum) < 0.001) return;
      const currentZoom = map.getZoom();
      const newZoom = Math.min(20, Math.max(3, currentZoom + zoomAccum));
      if (zoomCenter) {
        map.setZoomAround(zoomCenter, newZoom, { animate: false });
      }
      zoomAccum = 0;
    };

    // パン用の累積値（スムーズパン）
    let panDx = 0;
    let panDy = 0;
    let panRafId: number | null = null;

    const applyPan = () => {
      panRafId = null;
      if (Math.abs(panDx) < 0.5 && Math.abs(panDy) < 0.5) return;
      map.panBy([panDx, panDy], { animate: false });
      panDx = 0;
      panDy = 0;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ピンチズーム（トラックパッド2本指ピンチ = ctrlKey + wheel）
      if (e.ctrlKey || e.metaKey) {
        const mousePoint = map.mouseEventToContainerPoint(e);
        zoomCenter = map.containerPointToLatLng(mousePoint);
        // ピンチの感度を上げてGoogleマップに近づける
        zoomAccum += -e.deltaY * 0.02;
        if (!zoomRafId) {
          zoomRafId = requestAnimationFrame(applyZoom);
        }
        return;
      }

      // 通常スクロール（2本指スワイプ）→ パン（移動）
      panDx += e.deltaX;
      panDy += e.deltaY;
      if (!panRafId) {
        panRafId = requestAnimationFrame(applyPan);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomRafId) cancelAnimationFrame(zoomRafId);
      if (panRafId) cancelAnimationFrame(panRafId);
    };
  }, [map]);

  return null;
}

// ========================================
// 選択したスポットにスムーズに移動
// ========================================
function PanToSelected({ spots, selectedSpotId }: { spots: Spot[]; selectedSpotId: string | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedSpotId && selectedSpotId !== prevRef.current) {
      const spot = spots.find(s => s.id === selectedSpotId);
      if (spot?.lat != null && spot?.lng != null) {
        // Google Maps風のスムーズなパン
        map.panTo([spot.lat, spot.lng], { animate: true, duration: 0.4, easeLinearity: 0.5 });
      }
    }
    prevRef.current = selectedSpotId;
  }, [selectedSpotId, spots, map]);

  return null;
}

// ========================================
// メインの地図コンポーネント
// ========================================
const MapViewInner = forwardRef<MapViewHandle, MapViewProps>(function MapViewInner(
  { spots, selectedSpotId, onSpotSelect, visibleHeightVh = 35, spotDayMap = {} },
  ref
) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const controlRef = useRef<{ locateMe: () => void } | null>(null);

  const geoSpots = useMemo(
    () => spots.filter((s): s is Spot & { lat: number; lng: number } => s.lat != null && s.lng != null),
    [spots]
  );

  const initialCenter = useMemo<L.LatLngExpression>(() => {
    if (geoSpots.length === 0) return DEFAULT_CENTER;
    if (geoSpots.length === 1) return [geoSpots[0].lat, geoSpots[0].lng];
    const avgLat = geoSpots.reduce((s, p) => s + p.lat, 0) / geoSpots.length;
    const avgLng = geoSpots.reduce((s, p) => s + p.lng, 0) / geoSpots.length;
    return [avgLat, avgLng];
  }, [geoSpots]);

  const initialZoom = useMemo(() => geoSpots.length > 0 ? 10 : DEFAULT_ZOOM, [geoSpots]);

  const polylinePositions = useMemo<L.LatLngTuple[]>(
    () => geoSpots.map(s => [s.lat, s.lng]),
    [geoSpots]
  );

  const handleLocate = useCallback((lat: number, lng: number) => {
    setCurrentLocation({ lat, lng });
  }, []);

  // 外部からlocateMeを呼べるようにする
  useImperativeHandle(ref, () => ({
    locateMe: () => controlRef.current?.locateMe(),
  }), []);

  if (typeof window === 'undefined') {
    return <div style={{ width: '100%', height: '100%', background: '#E8EAED' }} />;
  }

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      inertia
      inertiaDeceleration={2000}
      inertiaMaxSpeed={1500}
      zoomAnimation
      zoomAnimationThreshold={4}
      markerZoomAnimation
      fadeAnimation
      zoomSnap={0.1}
      zoomDelta={0.5}
      wheelDebounceTime={40}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={20}
      />

      <FitBounds spots={geoSpots} />
      <PanToSelected spots={geoSpots} selectedSpotId={selectedSpotId} />
      <MapController controlRef={controlRef} onLocate={handleLocate} visibleHeightVh={visibleHeightVh} />
      <TrackpadPanHandler />

      {/* 現在地の青い丸マーカー（Google Maps風） */}
      {currentLocation && (
        <>
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={20}
            pathOptions={{
              color: '#4285F4',
              weight: 0,
              fillColor: '#4285F4',
              fillOpacity: 0.1,
            }}
          />
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={7}
            pathOptions={{
              color: 'white',
              weight: 2.5,
              fillColor: '#4285F4',
              fillOpacity: 1,
            }}
          />
        </>
      )}

      {polylinePositions.length >= 2 && (
        <>
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#4285F4',
              weight: 5,
              opacity: 0.3,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#4285F4',
              weight: 3,
              opacity: 0.8,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* 各スポットのピン */}
      {geoSpots.map((spot, idx) => {
        const isSelected = spot.id === selectedSpotId;
        const config = getSpotConfig(spot.type);

        return (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={createNumberedPin(spot, spotDayMap[spot.id], isSelected)}
            zIndexOffset={isSelected ? 1000 : spot.isMain ? 500 : 0}
            eventHandlers={{
              click: () => onSpotSelect(spot.id),
            }}
          >
            <Popup
              closeButton={false}
              className="google-maps-popup"
              autoPan
              autoPanPadding={L.point(40, 40)}
            >
              <div style={{
                padding: '8px 12px',
                minWidth: 150,
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <span style={{
                    background: config.color,
                    color: 'white',
                    borderRadius: 12,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}>
                    {config.icon} {config.label}
                  </span>
                  {spot.time && (
                    <span style={{ fontSize: 13, color: '#5F6368', fontWeight: 500 }}>
                      {spot.time}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  lineHeight: 1.3,
                }}>
                  {spot.name}
                </div>
                {spot.memo && (
                  <div style={{
                    fontSize: 12,
                    color: '#70757A',
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}>
                    {spot.memo}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
});

export default MapViewInner;
