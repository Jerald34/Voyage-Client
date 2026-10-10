// app/components/icons/index.js has JSX in a .js file, which Vitest can't parse.
// Tests mock it with inert components:
//   vi.mock("../app/components/icons/index.js", async () => (await import("./helpers/iconsMock.js")).default);
const NAMES = [
  "SearchIcon", "CloseIcon", "CheckIcon", "ReplyIcon", "ChatIcon", "MapPinIcon", "ArrowLeftIcon", "TrashIcon",
  "DownloadIcon", "PrinterIcon", "ShareIcon", "SettingsIcon", "UserIcon", "MailIcon", "LockIcon", "ShieldIcon",
  "HomeIcon", "PhoneIcon", "GlobeIcon", "ChevronDownIcon", "EyeIcon", "EyeOffIcon", "BuildingIcon", "PlusIcon",
  "CalendarIcon", "StarIcon", "PlaneIcon", "HotelIcon", "ForkKnifeIcon", "CarIcon", "ListIcon", "MapIcon",
  "SparkleIcon", "UsersIcon", "UserGroupIcon", "ZapIcon", "CommentIcon", "BookmarkIcon", "LinkIcon", "RefreshIcon",
  "CheckCircleIcon", "ChevronLeftIcon", "ArrowRightIcon", "PresenterIcon", "SortIcon", "MoreIcon", "PencilIcon",
];

const iconsMock = Object.fromEntries(NAMES.map((name) => [name, () => null]));

export default iconsMock;
