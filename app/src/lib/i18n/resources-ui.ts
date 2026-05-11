import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { AssetCategoryKey } from "@/types/assets";

export type ResourcesUiCopy = {
  /** Main Resources page title + subtitle (shown above the tab switcher). */
  pageTitle: string;
  pageSubtitle: string;
  /** Sub-tab labels — themed variants resolve through `getThemedItemLabel`. */
  tabs: {
    assets: string;
    documents: string;
  };
  /** Assets sub-tab page header copy. */
  assets: {
    title: string;
    subtitle: string;
    newAsset: string;
    searchPlaceholder: string;
    filterCategoryPlaceholder: string;
    /** Label used for "all" in the category filter dropdown. */
    filterAllCategories: string;
    /** Favorites-only filter chip. */
    favoritesOnly: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyCta: string;
  };
  /** Add / Edit asset dialog copy. */
  assetForm: {
    newTitle: string;
    editTitle: string;
    detailTitle: string;
    nameLabel: string;
    nameRequiredPlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    purchaseValueLabel: string;
    purchaseValuePlaceholder: string;
    currentValueLabel: string;
    currentValueHint: string;
    locationLabel: string;
    locationPlaceholder: string;
    purchaseDateLabel: string;
    serialNumberLabel: string;
    serialNumberPlaceholder: string;
    notesLabel: string;
    linkedDocumentLabel: string;
    linkedDocumentEmpty: string;
    linkedDocumentChoose: string;
    linkedDocumentChange: string;
    linkedDocumentClear: string;
    cancel: string;
    save: string;
    saving: string;
    create: string;
    creating: string;
    edit: string;
    delete: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: (name: string) => string;
    addedLabel: string;
  };
  /** Document picker modal copy. */
  documentPicker: {
    title: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDescription: string;
    clearSelection: string;
    noExpiration: string;
  };
  /** Localized labels for the constrained Asset category enum. */
  categories: Record<AssetCategoryKey, string>;
};

const english: ResourcesUiCopy = {
  pageTitle: "Resources",
  pageSubtitle: "Your assets and documents in one place",
  tabs: {
    assets: "Assets",
    documents: "Documents",
  },
  assets: {
    title: "Assets",
    subtitle: "Track and manage your valuable assets",
    newAsset: "New asset",
    searchPlaceholder: "Search assets…",
    filterCategoryPlaceholder: "Category",
    filterAllCategories: "All categories",
    favoritesOnly: "Favorites",
    emptyTitle: "No assets yet",
    emptyDescription: "Add your first asset to start building an inventory of what you own.",
    emptyCta: "Add asset",
  },
  assetForm: {
    newTitle: "New asset",
    editTitle: "Edit asset",
    detailTitle: "Asset details",
    nameLabel: "Name *",
    nameRequiredPlaceholder: "e.g. Laptop, Car",
    categoryLabel: "Category",
    categoryPlaceholder: "Pick a category",
    purchaseValueLabel: "Purchase value (USD)",
    purchaseValuePlaceholder: "0",
    currentValueLabel: "Current value (USD)",
    currentValueHint: "What it's worth today (optional).",
    locationLabel: "Location",
    locationPlaceholder: "Home office",
    purchaseDateLabel: "Purchase date",
    serialNumberLabel: "Serial number",
    serialNumberPlaceholder: "Optional",
    notesLabel: "Notes",
    linkedDocumentLabel: "Linked document",
    linkedDocumentEmpty: "No document linked",
    linkedDocumentChoose: "Link document",
    linkedDocumentChange: "Change",
    linkedDocumentClear: "Unlink",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    create: "Create",
    creating: "Creating…",
    edit: "Edit",
    delete: "Delete",
    deleteConfirmTitle: "Delete asset",
    deleteConfirmBody: (name: string) =>
      `Delete "${name}"? This cannot be undone.`,
    addedLabel: "Added",
  },
  documentPicker: {
    title: "Link a document",
    searchPlaceholder: "Search documents…",
    emptyTitle: "No documents found",
    emptyDescription: "Add a document from the Documents tab first.",
    clearSelection: "Clear selection",
    noExpiration: "No expiration",
  },
  categories: {
    real_estate: "Real Estate",
    vehicle: "Vehicle",
    electronics: "Electronics",
    musical_instrument: "Musical Instrument",
    investment: "Investment",
    other: "Other",
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<ResourcesUiCopy>>> = {
  "zh-TW": {
    pageTitle: "資源",
    pageSubtitle: "你的資產與文件集中管理",
    tabs: { assets: "資產", documents: "文件" },
    assets: {
      title: "資產",
      subtitle: "追蹤並管理你珍貴的資產",
      newAsset: "新增資產",
      searchPlaceholder: "搜尋資產…",
      filterCategoryPlaceholder: "分類",
      filterAllCategories: "所有分類",
      favoritesOnly: "已收藏",
      emptyTitle: "尚未新增資產",
      emptyDescription: "新增第一項資產，開始建立你擁有物品的清單。",
      emptyCta: "新增資產",
    },
    assetForm: {
      newTitle: "新增資產",
      editTitle: "編輯資產",
      detailTitle: "資產詳情",
      nameLabel: "名稱 *",
      nameRequiredPlaceholder: "例如：筆電、汽車",
      categoryLabel: "分類",
      categoryPlaceholder: "選擇分類",
      purchaseValueLabel: "購入金額（美元）",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "目前價值（美元）",
      currentValueHint: "今日估值（選填）。",
      locationLabel: "位置",
      locationPlaceholder: "家中辦公室",
      purchaseDateLabel: "購入日期",
      serialNumberLabel: "序號",
      serialNumberPlaceholder: "選填",
      notesLabel: "備註",
      linkedDocumentLabel: "連結文件",
      linkedDocumentEmpty: "尚未連結文件",
      linkedDocumentChoose: "連結文件",
      linkedDocumentChange: "變更",
      linkedDocumentClear: "取消連結",
      cancel: "取消",
      save: "儲存",
      saving: "儲存中…",
      create: "建立",
      creating: "建立中…",
      edit: "編輯",
      delete: "刪除",
      deleteConfirmTitle: "刪除資產",
      deleteConfirmBody: (name: string) => `刪除「${name}」？此動作無法復原。`,
      addedLabel: "新增於",
    },
    documentPicker: {
      title: "連結文件",
      searchPlaceholder: "搜尋文件…",
      emptyTitle: "找不到文件",
      emptyDescription: "請先從文件分頁新增文件。",
      clearSelection: "清除選擇",
      noExpiration: "無到期日",
    },
    categories: {
      real_estate: "不動產",
      vehicle: "交通工具",
      electronics: "電子產品",
      musical_instrument: "樂器",
      investment: "投資",
      other: "其他",
    },
  },
  "zh-CN": {
    pageTitle: "资源",
    pageSubtitle: "你的资产与文件集中管理",
    tabs: { assets: "资产", documents: "文件" },
    assets: {
      title: "资产",
      subtitle: "追踪并管理你珍贵的资产",
      newAsset: "新增资产",
      searchPlaceholder: "搜索资产…",
      filterCategoryPlaceholder: "分类",
      filterAllCategories: "所有分类",
      favoritesOnly: "已收藏",
      emptyTitle: "尚未新增资产",
      emptyDescription: "添加第一项资产，开始建立你拥有物品的清单。",
      emptyCta: "新增资产",
    },
    assetForm: {
      newTitle: "新增资产",
      editTitle: "编辑资产",
      detailTitle: "资产详情",
      nameLabel: "名称 *",
      nameRequiredPlaceholder: "例如：笔记本、汽车",
      categoryLabel: "分类",
      categoryPlaceholder: "选择分类",
      purchaseValueLabel: "购入金额（美元）",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "当前价值（美元）",
      currentValueHint: "今日估值（选填）。",
      locationLabel: "位置",
      locationPlaceholder: "家庭办公室",
      purchaseDateLabel: "购入日期",
      serialNumberLabel: "序列号",
      serialNumberPlaceholder: "选填",
      notesLabel: "备注",
      linkedDocumentLabel: "关联文件",
      linkedDocumentEmpty: "尚未关联文件",
      linkedDocumentChoose: "关联文件",
      linkedDocumentChange: "更改",
      linkedDocumentClear: "取消关联",
      cancel: "取消",
      save: "保存",
      saving: "保存中…",
      create: "创建",
      creating: "创建中…",
      edit: "编辑",
      delete: "删除",
      deleteConfirmTitle: "删除资产",
      deleteConfirmBody: (name: string) => `删除"${name}"？此操作无法撤销。`,
      addedLabel: "添加于",
    },
    documentPicker: {
      title: "关联文件",
      searchPlaceholder: "搜索文件…",
      emptyTitle: "未找到文件",
      emptyDescription: "请先从文件标签添加文件。",
      clearSelection: "清除选择",
      noExpiration: "无到期日",
    },
    categories: {
      real_estate: "不动产",
      vehicle: "交通工具",
      electronics: "电子产品",
      musical_instrument: "乐器",
      investment: "投资",
      other: "其他",
    },
  },
  ja: {
    pageTitle: "リソース",
    pageSubtitle: "資産と書類を一か所で管理",
    tabs: { assets: "資産", documents: "書類" },
    assets: {
      title: "資産",
      subtitle: "大切な資産を記録・管理",
      newAsset: "資産を追加",
      searchPlaceholder: "資産を検索…",
      filterCategoryPlaceholder: "カテゴリー",
      filterAllCategories: "すべてのカテゴリー",
      favoritesOnly: "お気に入り",
      emptyTitle: "資産はまだありません",
      emptyDescription: "最初の資産を追加して、所有物のインベントリを作りましょう。",
      emptyCta: "資産を追加",
    },
    assetForm: {
      newTitle: "資産を追加",
      editTitle: "資産を編集",
      detailTitle: "資産の詳細",
      nameLabel: "名称 *",
      nameRequiredPlaceholder: "例：ノートPC、車",
      categoryLabel: "カテゴリー",
      categoryPlaceholder: "カテゴリーを選択",
      purchaseValueLabel: "購入価格（USD）",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "現在の価値（USD）",
      currentValueHint: "今日の推定価値（任意）。",
      locationLabel: "場所",
      locationPlaceholder: "自宅オフィス",
      purchaseDateLabel: "購入日",
      serialNumberLabel: "シリアル番号",
      serialNumberPlaceholder: "任意",
      notesLabel: "メモ",
      linkedDocumentLabel: "関連書類",
      linkedDocumentEmpty: "書類は関連付けられていません",
      linkedDocumentChoose: "書類を関連付ける",
      linkedDocumentChange: "変更",
      linkedDocumentClear: "関連付け解除",
      cancel: "キャンセル",
      save: "保存",
      saving: "保存中…",
      create: "作成",
      creating: "作成中…",
      edit: "編集",
      delete: "削除",
      deleteConfirmTitle: "資産を削除",
      deleteConfirmBody: (name: string) =>
        `「${name}」を削除しますか？この操作は取り消せません。`,
      addedLabel: "追加日",
    },
    documentPicker: {
      title: "書類を関連付ける",
      searchPlaceholder: "書類を検索…",
      emptyTitle: "書類が見つかりません",
      emptyDescription: "先に書類タブから書類を追加してください。",
      clearSelection: "選択を解除",
      noExpiration: "有効期限なし",
    },
    categories: {
      real_estate: "不動産",
      vehicle: "乗り物",
      electronics: "電子機器",
      musical_instrument: "楽器",
      investment: "投資",
      other: "その他",
    },
  },
  ko: {
    pageTitle: "리소스",
    pageSubtitle: "자산과 문서를 한 곳에서 관리",
    tabs: { assets: "자산", documents: "문서" },
    assets: {
      title: "자산",
      subtitle: "소중한 자산을 추적하고 관리하세요",
      newAsset: "자산 추가",
      searchPlaceholder: "자산 검색…",
      filterCategoryPlaceholder: "카테고리",
      filterAllCategories: "모든 카테고리",
      favoritesOnly: "즐겨찾기",
      emptyTitle: "아직 자산이 없습니다",
      emptyDescription: "첫 번째 자산을 추가해 보유한 물품의 인벤토리를 만들어 보세요.",
      emptyCta: "자산 추가",
    },
    assetForm: {
      newTitle: "자산 추가",
      editTitle: "자산 편집",
      detailTitle: "자산 정보",
      nameLabel: "이름 *",
      nameRequiredPlaceholder: "예: 노트북, 자동차",
      categoryLabel: "카테고리",
      categoryPlaceholder: "카테고리 선택",
      purchaseValueLabel: "구매 금액 (USD)",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "현재 가치 (USD)",
      currentValueHint: "오늘 기준 가치 (선택).",
      locationLabel: "위치",
      locationPlaceholder: "홈 오피스",
      purchaseDateLabel: "구매 날짜",
      serialNumberLabel: "시리얼 번호",
      serialNumberPlaceholder: "선택",
      notesLabel: "메모",
      linkedDocumentLabel: "연결된 문서",
      linkedDocumentEmpty: "연결된 문서 없음",
      linkedDocumentChoose: "문서 연결",
      linkedDocumentChange: "변경",
      linkedDocumentClear: "연결 해제",
      cancel: "취소",
      save: "저장",
      saving: "저장 중…",
      create: "만들기",
      creating: "만드는 중…",
      edit: "편집",
      delete: "삭제",
      deleteConfirmTitle: "자산 삭제",
      deleteConfirmBody: (name: string) =>
        `"${name}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`,
      addedLabel: "추가됨",
    },
    documentPicker: {
      title: "문서 연결",
      searchPlaceholder: "문서 검색…",
      emptyTitle: "문서를 찾을 수 없습니다",
      emptyDescription: "먼저 문서 탭에서 문서를 추가하세요.",
      clearSelection: "선택 해제",
      noExpiration: "만료일 없음",
    },
    categories: {
      real_estate: "부동산",
      vehicle: "차량",
      electronics: "전자기기",
      musical_instrument: "악기",
      investment: "투자",
      other: "기타",
    },
  },
  fr: {
    pageTitle: "Ressources",
    pageSubtitle: "Vos actifs et documents au même endroit",
    tabs: { assets: "Actifs", documents: "Documents" },
    assets: {
      title: "Actifs",
      subtitle: "Suivez et gérez vos biens précieux",
      newAsset: "Nouvel actif",
      searchPlaceholder: "Rechercher des actifs…",
      filterCategoryPlaceholder: "Catégorie",
      filterAllCategories: "Toutes les catégories",
      favoritesOnly: "Favoris",
      emptyTitle: "Aucun actif pour l'instant",
      emptyDescription: "Ajoutez votre premier actif pour constituer l'inventaire de ce que vous possédez.",
      emptyCta: "Ajouter un actif",
    },
    assetForm: {
      newTitle: "Nouvel actif",
      editTitle: "Modifier l'actif",
      detailTitle: "Détails de l'actif",
      nameLabel: "Nom *",
      nameRequiredPlaceholder: "ex. Ordinateur, Voiture",
      categoryLabel: "Catégorie",
      categoryPlaceholder: "Choisir une catégorie",
      purchaseValueLabel: "Prix d'achat (USD)",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "Valeur actuelle (USD)",
      currentValueHint: "Valeur estimée aujourd'hui (facultatif).",
      locationLabel: "Emplacement",
      locationPlaceholder: "Bureau à domicile",
      purchaseDateLabel: "Date d'achat",
      serialNumberLabel: "Numéro de série",
      serialNumberPlaceholder: "Facultatif",
      notesLabel: "Notes",
      linkedDocumentLabel: "Document lié",
      linkedDocumentEmpty: "Aucun document lié",
      linkedDocumentChoose: "Lier un document",
      linkedDocumentChange: "Changer",
      linkedDocumentClear: "Dissocier",
      cancel: "Annuler",
      save: "Enregistrer",
      saving: "Enregistrement…",
      create: "Créer",
      creating: "Création…",
      edit: "Modifier",
      delete: "Supprimer",
      deleteConfirmTitle: "Supprimer l'actif",
      deleteConfirmBody: (name: string) =>
        `Supprimer « ${name} » ? Cette action est irréversible.`,
      addedLabel: "Ajouté",
    },
    documentPicker: {
      title: "Lier un document",
      searchPlaceholder: "Rechercher des documents…",
      emptyTitle: "Aucun document trouvé",
      emptyDescription: "Ajoutez d'abord un document depuis l'onglet Documents.",
      clearSelection: "Effacer la sélection",
      noExpiration: "Sans expiration",
    },
    categories: {
      real_estate: "Immobilier",
      vehicle: "Véhicule",
      electronics: "Électronique",
      musical_instrument: "Instrument de musique",
      investment: "Placement",
      other: "Autre",
    },
  },
  it: {
    pageTitle: "Risorse",
    pageSubtitle: "I tuoi beni e documenti in un unico posto",
    tabs: { assets: "Beni", documents: "Documenti" },
    assets: {
      title: "Beni",
      subtitle: "Traccia e gestisci i tuoi beni di valore",
      newAsset: "Nuovo bene",
      searchPlaceholder: "Cerca beni…",
      filterCategoryPlaceholder: "Categoria",
      filterAllCategories: "Tutte le categorie",
      favoritesOnly: "Preferiti",
      emptyTitle: "Nessun bene ancora",
      emptyDescription: "Aggiungi il tuo primo bene per iniziare a costruire un inventario.",
      emptyCta: "Aggiungi bene",
    },
    assetForm: {
      newTitle: "Nuovo bene",
      editTitle: "Modifica bene",
      detailTitle: "Dettagli del bene",
      nameLabel: "Nome *",
      nameRequiredPlaceholder: "es. Portatile, Auto",
      categoryLabel: "Categoria",
      categoryPlaceholder: "Scegli una categoria",
      purchaseValueLabel: "Prezzo d'acquisto (USD)",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "Valore attuale (USD)",
      currentValueHint: "Valore stimato oggi (opzionale).",
      locationLabel: "Posizione",
      locationPlaceholder: "Ufficio di casa",
      purchaseDateLabel: "Data d'acquisto",
      serialNumberLabel: "Numero di serie",
      serialNumberPlaceholder: "Opzionale",
      notesLabel: "Note",
      linkedDocumentLabel: "Documento collegato",
      linkedDocumentEmpty: "Nessun documento collegato",
      linkedDocumentChoose: "Collega documento",
      linkedDocumentChange: "Cambia",
      linkedDocumentClear: "Scollega",
      cancel: "Annulla",
      save: "Salva",
      saving: "Salvataggio…",
      create: "Crea",
      creating: "Creazione…",
      edit: "Modifica",
      delete: "Elimina",
      deleteConfirmTitle: "Elimina bene",
      deleteConfirmBody: (name: string) =>
        `Eliminare "${name}"? Operazione irreversibile.`,
      addedLabel: "Aggiunto",
    },
    documentPicker: {
      title: "Collega un documento",
      searchPlaceholder: "Cerca documenti…",
      emptyTitle: "Nessun documento trovato",
      emptyDescription: "Aggiungi prima un documento dalla scheda Documenti.",
      clearSelection: "Cancella selezione",
      noExpiration: "Senza scadenza",
    },
    categories: {
      real_estate: "Immobili",
      vehicle: "Veicolo",
      electronics: "Elettronica",
      musical_instrument: "Strumento musicale",
      investment: "Investimento",
      other: "Altro",
    },
  },
  es: {
    pageTitle: "Recursos",
    pageSubtitle: "Tus activos y documentos en un solo lugar",
    tabs: { assets: "Activos", documents: "Documentos" },
    assets: {
      title: "Activos",
      subtitle: "Registra y gestiona tus bienes valiosos",
      newAsset: "Nuevo activo",
      searchPlaceholder: "Buscar activos…",
      filterCategoryPlaceholder: "Categoría",
      filterAllCategories: "Todas las categorías",
      favoritesOnly: "Favoritos",
      emptyTitle: "Aún no hay activos",
      emptyDescription: "Añade tu primer activo para empezar a construir un inventario de lo que posees.",
      emptyCta: "Añadir activo",
    },
    assetForm: {
      newTitle: "Nuevo activo",
      editTitle: "Editar activo",
      detailTitle: "Detalles del activo",
      nameLabel: "Nombre *",
      nameRequiredPlaceholder: "ej. Portátil, Coche",
      categoryLabel: "Categoría",
      categoryPlaceholder: "Elegir categoría",
      purchaseValueLabel: "Precio de compra (USD)",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "Valor actual (USD)",
      currentValueHint: "Valor estimado hoy (opcional).",
      locationLabel: "Ubicación",
      locationPlaceholder: "Oficina en casa",
      purchaseDateLabel: "Fecha de compra",
      serialNumberLabel: "Número de serie",
      serialNumberPlaceholder: "Opcional",
      notesLabel: "Notas",
      linkedDocumentLabel: "Documento vinculado",
      linkedDocumentEmpty: "Sin documento vinculado",
      linkedDocumentChoose: "Vincular documento",
      linkedDocumentChange: "Cambiar",
      linkedDocumentClear: "Desvincular",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando…",
      create: "Crear",
      creating: "Creando…",
      edit: "Editar",
      delete: "Eliminar",
      deleteConfirmTitle: "Eliminar activo",
      deleteConfirmBody: (name: string) =>
        `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
      addedLabel: "Añadido",
    },
    documentPicker: {
      title: "Vincular un documento",
      searchPlaceholder: "Buscar documentos…",
      emptyTitle: "No se encontraron documentos",
      emptyDescription: "Añade primero un documento desde la pestaña Documentos.",
      clearSelection: "Limpiar selección",
      noExpiration: "Sin caducidad",
    },
    categories: {
      real_estate: "Inmuebles",
      vehicle: "Vehículo",
      electronics: "Electrónica",
      musical_instrument: "Instrumento musical",
      investment: "Inversión",
      other: "Otro",
    },
  },
  vi: {
    pageTitle: "Tài nguyên",
    pageSubtitle: "Tài sản và tài liệu của bạn tại một nơi",
    tabs: { assets: "Tài sản", documents: "Tài liệu" },
    assets: {
      title: "Tài sản",
      subtitle: "Theo dõi và quản lý các tài sản giá trị của bạn",
      newAsset: "Tài sản mới",
      searchPlaceholder: "Tìm kiếm tài sản…",
      filterCategoryPlaceholder: "Danh mục",
      filterAllCategories: "Tất cả danh mục",
      favoritesOnly: "Yêu thích",
      emptyTitle: "Chưa có tài sản nào",
      emptyDescription: "Thêm tài sản đầu tiên để bắt đầu xây dựng danh mục những gì bạn sở hữu.",
      emptyCta: "Thêm tài sản",
    },
    assetForm: {
      newTitle: "Tài sản mới",
      editTitle: "Chỉnh sửa tài sản",
      detailTitle: "Chi tiết tài sản",
      nameLabel: "Tên *",
      nameRequiredPlaceholder: "ví dụ: Laptop, Xe hơi",
      categoryLabel: "Danh mục",
      categoryPlaceholder: "Chọn danh mục",
      purchaseValueLabel: "Giá mua (USD)",
      purchaseValuePlaceholder: "0",
      currentValueLabel: "Giá trị hiện tại (USD)",
      currentValueHint: "Giá trị ước tính hôm nay (tùy chọn).",
      locationLabel: "Vị trí",
      locationPlaceholder: "Văn phòng tại nhà",
      purchaseDateLabel: "Ngày mua",
      serialNumberLabel: "Số sê-ri",
      serialNumberPlaceholder: "Tùy chọn",
      notesLabel: "Ghi chú",
      linkedDocumentLabel: "Tài liệu liên kết",
      linkedDocumentEmpty: "Chưa liên kết tài liệu",
      linkedDocumentChoose: "Liên kết tài liệu",
      linkedDocumentChange: "Thay đổi",
      linkedDocumentClear: "Bỏ liên kết",
      cancel: "Hủy",
      save: "Lưu",
      saving: "Đang lưu…",
      create: "Tạo",
      creating: "Đang tạo…",
      edit: "Chỉnh sửa",
      delete: "Xóa",
      deleteConfirmTitle: "Xóa tài sản",
      deleteConfirmBody: (name: string) =>
        `Xóa "${name}"? Không thể hoàn tác.`,
      addedLabel: "Đã thêm",
    },
    documentPicker: {
      title: "Liên kết tài liệu",
      searchPlaceholder: "Tìm kiếm tài liệu…",
      emptyTitle: "Không tìm thấy tài liệu",
      emptyDescription: "Vui lòng thêm tài liệu từ tab Tài liệu trước.",
      clearSelection: "Bỏ chọn",
      noExpiration: "Không hết hạn",
    },
    categories: {
      real_estate: "Bất động sản",
      vehicle: "Phương tiện",
      electronics: "Điện tử",
      musical_instrument: "Nhạc cụ",
      investment: "Đầu tư",
      other: "Khác",
    },
  },
};

const resourcesUiCopyMap = createLocaleCopyMap<ResourcesUiCopy>(english, overrides);

export function getResourcesUiCopy(locale: AppLocale): ResourcesUiCopy {
  return resourcesUiCopyMap[locale];
}
