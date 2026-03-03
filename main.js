const SAMPLE_PLACES = [
  {
    id: "seoul-1",
    name: "서울숲 놀이터 & 산책 코스",
    area: "서울 성동구",
    category: "park",
    indoor: false,
    price: "무료",
    age: ["toddler", "kids"],
    stroller: true,
    restroom: true,
    lat: 37.5446,
    lng: 127.0374,
    desc: "넓은 산책로 + 놀이터 + 잔디 광장",
    searchVolume: 9800,
    popularity: 92
  },
  {
    id: "seoul-2",
    name: "국립과천과학관",
    area: "경기 과천",
    category: "museum",
    indoor: true,
    price: "유료",
    age: ["kids"],
    stroller: true,
    restroom: true,
    lat: 37.4363,
    lng: 127.005,
    desc: "비 오는 날 좋은 실내 체험 코스",
    searchVolume: 8600,
    popularity: 88
  },
  {
    id: "seoul-3",
    name: "강남 키즈 실내놀이터",
    area: "서울 강남구",
    category: "play",
    indoor: true,
    price: "유료",
    age: ["toddler", "kids"],
    stroller: true,
    restroom: true,
    lat: 37.498,
    lng: 127.0276,
    desc: "날씨 상관없이 이용 가능한 실내형",
    searchVolume: 12400,
    popularity: 95
  },
  {
    id: "su-1",
    name: "광교호수공원",
    area: "경기 수원 영통구",
    category: "park",
    indoor: false,
    price: "무료",
    age: ["toddler", "kids"],
    stroller: true,
    restroom: true,
    lat: 37.2841,
    lng: 127.0644,
    desc: "산책 + 놀이터를 한 번에 즐기기 좋은 코스",
    searchVolume: 7900,
    popularity: 84
  },
  {
    id: "anyang-1",
    name: "안양예술공원 산책 코스",
    area: "경기 안양 만안구",
    category: "park",
    indoor: false,
    price: "무료",
    age: ["toddler", "kids"],
    stroller: true,
    restroom: true,
    lat: 37.4138,
    lng: 126.9327,
    desc: "가벼운 산책과 야외 체험이 가능한 안양 대표 가족 코스",
    searchVolume: 6800,
    popularity: 82
  },
  {
    id: "anyang-2",
    name: "안양 어린이천문대 체험관",
    area: "경기 안양 동안구",
    category: "museum",
    indoor: true,
    price: "유료",
    age: ["kids"],
    stroller: true,
    restroom: true,
    lat: 37.3942,
    lng: 126.9568,
    desc: "실내 과학 체험 중심의 주말 가족 프로그램",
    searchVolume: 5200,
    popularity: 78
  },
  {
    id: "incheon-1",
    name: "송도 센트럴파크",
    area: "인천 연수구 송도",
    category: "park",
    indoor: false,
    price: "무료",
    age: ["kids"],
    stroller: true,
    restroom: true,
    lat: 37.3929,
    lng: 126.6392,
    desc: "넓은 동선과 체험 포인트가 있는 공원",
    searchVolume: 11200,
    popularity: 90
  },
  {
    id: "show-1",
    name: "종로 키즈 전시",
    area: "서울 종로구",
    category: "show",
    indoor: true,
    price: "유료",
    age: ["kids"],
    stroller: true,
    restroom: true,
    lat: 37.5729,
    lng: 126.9794,
    desc: "짧은 시간 집중해서 즐기는 공연/전시",
    searchVolume: 7300,
    popularity: 81
  }
];

const state = {
  userLoc: null,
  sortBy: localStorage.getItem("kids_sort_by") || "recommend",
  naverClientId: localStorage.getItem("kids_naver_client_id") || "",
  dataSource: localStorage.getItem("kids_data_source") || "sample",
  publicEndpoint: localStorage.getItem("kids_public_endpoint") || "",
  publicKey: localStorage.getItem("kids_public_key") || "",
  places: [...SAMPLE_PLACES],
  filtered: [],
  quickCategory: "all",
  map: null,
  markers: []
};

const $ = (sel) => document.querySelector(sel);

const CAT_LABEL = {
  all: "전체",
  park: "공원/자연",
  museum: "박물관/과학관",
  play: "실내놀이터",
  experience: "체험/클래스",
  show: "공연/전시"
};

const SORT_LABEL = {
  recommend: "추천순",
  search_volume: "검색량순",
  popularity: "인기순"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function matchesQuery(place, rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) return true;

  const haystack = normalizeText(`${place.name} ${place.area} ${place.desc}`);
  const queryNorm = normalizeText(query);
  if (queryNorm && haystack.includes(queryNorm)) return true;

  const tokens = query
    .split(/[\s,./]+/)
    .map((token) => normalizeText(token))
    .filter((token) => token.length >= 2);

  if (!tokens.length) return true;
  return tokens.some((token) => haystack.includes(token));
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function matchesMood(place, mood) {
  if (mood === "any") return true;
  if (mood === "rainy") return place.indoor === true;
  if (mood === "toddler") return place.age.includes("toddler");
  if (mood === "kids") return place.age.includes("kids");
  if (mood === "stroller") return place.stroller === true;
  return true;
}

function scorePlace(place, query) {
  let score = 0;
  const q = query.toLowerCase();
  const hay = (place.name + " " + place.area + " " + place.desc).toLowerCase();
  if (q && hay.includes(q)) score += 3;
  if (place.price.includes("무료")) score += 1;
  if (place.indoor) score += 0.5;
  return score;
}

function scoreRecommend(place, query) {
  let score = scorePlace(place, query);
  score += (Number(place.popularity) || 0) * 0.08;
  score += (Number(place.searchVolume) || 0) / 8000;
  if (state.userLoc) {
    const dist = distanceKm(state.userLoc, place);
    score += Math.max(0, 2 - Math.min(dist, 2));
  }
  return score;
}

function toNumberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlace(raw, idx) {
  const name = raw.name || raw.title || raw.facilityName || raw.FCLTY_NM || raw.BPLC_NM || raw.place_name;
  const latRaw = raw.lat ?? raw.latitude ?? raw.y ?? raw.mapy ?? raw.Y ?? raw.LAT;
  const lngRaw = raw.lng ?? raw.longitude ?? raw.x ?? raw.mapx ?? raw.X ?? raw.LNG;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const area = raw.area || raw.address || raw.addr || raw.REFINE_ROADNM_ADDR || raw.RDNMADR || "지역 정보 없음";
  const category = raw.category || raw.categoryCode || "experience";
  const indoor = raw.indoor ?? false;
  const price = raw.price || "요금 확인";
  const stroller = raw.stroller ?? true;
  const restroom = raw.restroom ?? true;
  const desc = raw.desc || raw.description || raw.summary || "공공데이터 연동 장소";
  const searchVolume = toNumberOr(raw.searchVolume ?? raw.search_count ?? raw.searchCnt ?? raw.SRCH_CNT, 3000 + idx * 137);
  const popularity = toNumberOr(raw.popularity ?? raw.favoriteCount ?? raw.likeCount ?? raw.POPULARITY, 60 + (idx % 30));

  return {
    id: raw.id || `public-${idx}`,
    name,
    area,
    category: CAT_LABEL[category] ? category : "experience",
    indoor: Boolean(indoor),
    price,
    age: Array.isArray(raw.age) && raw.age.length ? raw.age : ["kids"],
    stroller: Boolean(stroller),
    restroom: Boolean(restroom),
    lat,
    lng,
    desc,
    searchVolume,
    popularity
  };
}

function pickArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const queue = [payload];
  while (queue.length) {
    const current = queue.shift();
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return [];
}

function buildEndpoint(url, key) {
  if (!key) return url;
  if (url.includes("{SERVICE_KEY}")) {
    return url.replaceAll("{SERVICE_KEY}", encodeURIComponent(key));
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}serviceKey=${encodeURIComponent(key)}`;
}

async function loadPublicPlaces() {
  if (state.dataSource !== "public") {
    state.places = [...SAMPLE_PLACES];
    return;
  }

  const endpoint = state.publicEndpoint.trim();
  if (!endpoint) {
    throw new Error("공공 API Endpoint URL이 비어 있습니다.");
  }

  const response = await fetch(buildEndpoint(endpoint, state.publicKey.trim()));
  if (!response.ok) {
    throw new Error(`공공 API 요청 실패: ${response.status}`);
  }

  const payload = await response.json();
  const rows = pickArrayPayload(payload);
  const normalized = rows.map(normalizePlace).filter(Boolean);

  if (!normalized.length) {
    throw new Error("좌표/장소명 필드를 찾지 못했습니다. 응답 스키마를 확인하세요.");
  }

  state.places = normalized;
}

function createCard(place) {
  const dist = state.userLoc ? ` · ${distanceKm(state.userLoc, place).toFixed(1)}km` : "";
  const tags = [
    CAT_LABEL[place.category] || "기타",
    place.indoor ? "실내" : "실외",
    place.price,
    `검색량 ${Number(place.searchVolume || 0).toLocaleString()}`,
    `인기점수 ${Number(place.popularity || 0)}`,
    place.stroller ? "유모차 OK" : "유모차 확인",
    place.restroom ? "화장실 있음" : "화장실 확인"
  ];

  return `
    <article class="item">
      <h3>${escapeHtml(place.name)}</h3>
      <p>${escapeHtml(place.area)}${escapeHtml(dist)}</p>
      <p>${escapeHtml(place.desc)}</p>
      <div class="tags">
        ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderChips() {
  const chips = $("#chips");
  const order = ["all", "park", "museum", "play", "experience", "show"];
  chips.innerHTML = order
    .map((key) => `<button class="chip ${state.quickCategory === key ? "active" : ""}" data-chip="${key}" type="button">${CAT_LABEL[key]}</button>`)
    .join("");

  chips.querySelectorAll("[data-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.quickCategory = chip.getAttribute("data-chip") || "all";
      searchAndRender();
    });
  });
}

function searchAndRender() {
  const query = $("#q").value.trim().toLowerCase();
  const category = $("#category").value;
  const mood = $("#mood").value;
  const sortBy = $("#sortBy").value;

  let list = [...state.places];

  if (query) {
    list = list.filter((p) => matchesQuery(p, query));
  }

  const finalCategory = state.quickCategory !== "all" ? state.quickCategory : category;
  if (finalCategory !== "all") {
    list = list.filter((p) => p.category === finalCategory);
  }

  list = list.filter((p) => matchesMood(p, mood));

  if (sortBy === "search_volume") {
    list.sort((a, b) => (Number(b.searchVolume) || 0) - (Number(a.searchVolume) || 0));
  } else if (sortBy === "popularity") {
    list.sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0));
  } else {
    list.sort((a, b) => scoreRecommend(b, query) - scoreRecommend(a, query));
  }

  if (state.userLoc) {
    list.sort((a, b) => {
      const baseA = sortBy === "search_volume"
        ? (Number(a.searchVolume) || 0)
        : sortBy === "popularity"
          ? (Number(a.popularity) || 0)
          : scoreRecommend(a, query);
      const baseB = sortBy === "search_volume"
        ? (Number(b.searchVolume) || 0)
        : sortBy === "popularity"
          ? (Number(b.popularity) || 0)
          : scoreRecommend(b, query);

      const gap = Math.abs(baseA - baseB);
      if (gap < 0.5) {
        return distanceKm(state.userLoc, a) - distanceKm(state.userLoc, b);
      }
      return baseB - baseA;
    });
  }

  state.filtered = list;
  state.sortBy = sortBy;
  localStorage.setItem("kids_sort_by", state.sortBy);
  $("#meta").textContent = `결과 ${list.length}개 · 정렬: ${SORT_LABEL[sortBy] || "추천순"}${state.userLoc ? " (근처 우선 보정)" : ""}`;

  const target = $("#resultList");
  if (!list.length) {
    target.innerHTML = '<article class="item"><h3>검색 결과가 없습니다.</h3><p>조건을 조금 완화해서 다시 검색해 주세요.</p></article>';
  } else {
    target.innerHTML = list.map(createCard).join("");
  }

  renderMapMarkers(list);
}

function getMapCenter(list) {
  if (state.userLoc) return new naver.maps.LatLng(state.userLoc.lat, state.userLoc.lng);
  if (list.length) return new naver.maps.LatLng(list[0].lat, list[0].lng);
  return new naver.maps.LatLng(37.5665, 126.978);
}

function clearMarkers() {
  state.markers.forEach((marker) => marker.setMap(null));
  state.markers = [];
}

function renderMapMarkers(list) {
  if (!window.naver || !window.naver.maps || !state.map) return;

  clearMarkers();

  if (!list.length) return;

  list.forEach((place) => {
    const marker = new naver.maps.Marker({
      map: state.map,
      position: new naver.maps.LatLng(place.lat, place.lng),
      title: place.name
    });

    const infoWindow = new naver.maps.InfoWindow({
      content: `<div style="padding:8px 10px;font-size:12px;font-weight:700;">${escapeHtml(place.name)}</div>`
    });

    naver.maps.Event.addListener(marker, "click", () => {
      infoWindow.open(state.map, marker);
    });

    state.markers.push(marker);
  });

  state.map.setCenter(getMapCenter(list));
}

function loadNaverMapScript(clientId) {
  return new Promise((resolve, reject) => {
    if (window.naver && window.naver.maps) {
      resolve();
      return;
    }

    if (!clientId) {
      reject(new Error("NAVER Client ID를 입력해 주세요."));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("NAVER 지도 스크립트 로드에 실패했습니다."));
    document.head.appendChild(script);
  });
}

async function initMapIfPossible() {
  const status = $("#mapStatus");

  try {
    await loadNaverMapScript(state.naverClientId.trim());

    if (!state.map) {
      state.map = new naver.maps.Map("map", {
        center: getMapCenter(state.filtered.length ? state.filtered : state.places),
        zoom: 11
      });
    }

    status.textContent = `네이버 지도 연결됨 · 데이터 ${state.places.length}건`;
    renderMapMarkers(state.filtered.length ? state.filtered : state.places);
  } catch (error) {
    status.textContent = error.message;
  }
}

function persistSettings() {
  localStorage.setItem("kids_sort_by", state.sortBy);
  localStorage.setItem("kids_naver_client_id", state.naverClientId);
  localStorage.setItem("kids_data_source", state.dataSource);
  localStorage.setItem("kids_public_endpoint", state.publicEndpoint);
  localStorage.setItem("kids_public_key", state.publicKey);
}

function bindEvents() {
  $("#btnSearch").addEventListener("click", searchAndRender);
  $("#q").addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchAndRender();
  });

  $("#category").addEventListener("change", () => {
    state.quickCategory = "all";
    renderChips();
    searchAndRender();
  });
  $("#mood").addEventListener("change", searchAndRender);
  $("#sortBy").addEventListener("change", searchAndRender);

  $("#btnNear").addEventListener("click", () => {
    if (!navigator.geolocation) {
      $("#locHint").textContent = "브라우저에서 위치 기능을 지원하지 않습니다.";
      return;
    }

    $("#locHint").textContent = "현재 위치 확인 중...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        $("#locHint").textContent = "현재 위치 기반 정렬이 적용되었습니다.";
        searchAndRender();
      },
      () => {
        $("#locHint").textContent = "위치 권한이 거부되어 일반 정렬로 표시합니다.";
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });

  $("#btnApplyApi").addEventListener("click", async () => {
    state.naverClientId = $("#naverClientId").value.trim();
    state.dataSource = $("#dataSource").value;
    state.publicEndpoint = $("#publicEndpoint").value.trim();
    state.publicKey = $("#publicKey").value.trim();

    persistSettings();

    try {
      await loadPublicPlaces();
      renderChips();
      searchAndRender();
      await initMapIfPossible();
    } catch (error) {
      $("#meta").textContent = error.message;
      $("#mapStatus").textContent = "데이터 로드 실패";
    }
  });
}

function hydrateForm() {
  $("#sortBy").value = SORT_LABEL[state.sortBy] ? state.sortBy : "recommend";
  $("#naverClientId").value = state.naverClientId;
  $("#dataSource").value = state.dataSource;
  $("#publicEndpoint").value = state.publicEndpoint;
  $("#publicKey").value = state.publicKey;
}

async function bootstrap() {
  $("#year").textContent = new Date().getFullYear();
  hydrateForm();
  bindEvents();
  renderChips();

  try {
    await loadPublicPlaces();
  } catch (error) {
    $("#meta").textContent = `초기 데이터 로드 실패: ${error.message}`;
    state.places = [...SAMPLE_PLACES];
  }

  searchAndRender();
  await initMapIfPossible();
}

bootstrap();
