import { CARD_ASSETS } from "./cardAssets";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { X, Zap, Shield, Swords, Hand } from "lucide-react";
import type { CardType } from "./game";
export const COLORS = ["#a78bfa", "#2dd4bf", "#fbbf24", "#fb7185"];
export const teamStyle = (index: number) =>
  ({ "--team": COLORS[index] }) as CSSProperties;
export const CARD_INFO = {
  double: {
    name: "Cược lớn",
    english: "Double",
    description: "Đúng ×2 · Sai −×2",
    icon: Zap,
  },
  safe: {
    name: "An toàn",
    english: "Safe",
    description: "Đúng +điểm · Sai 0",
    icon: Shield,
  },
  challenge: {
    name: "Thách đố",
    english: "Challenge",
    description: "Chỉ định đội khác trả lời",
    icon: Swords,
  },
  steal: {
    name: "Cướp lượt",
    english: "Steal",
    description: "Trả lời sau khi chủ nhà sai",
    icon: Hand,
  },
};
export function CardArt({card,className=""}:{card:CardType;className?:string}) {
 return <img className={`cardArt ${className}`} src={CARD_ASSETS[card]} alt="" aria-hidden="true" draggable={false}/>;
}
export function Cards({ cards }: { cards: Record<CardType, number> }) {
  return (
    <div className="cardInventory">
      {(Object.keys(CARD_INFO) as CardType[]).map((key) => {
        return (
          <span
            key={key}
            className={cards[key] ? "" : "empty"}
            title={`${CARD_INFO[key].english}: ${cards[key]} thẻ`}
            aria-label={`${CARD_INFO[key].name}: ${cards[key]} thẻ`}
          >
            <CardArt card={key} />
            <b>{cards[key]}</b>
          </span>
        );
      })}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const elements = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));
    elements()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const items = elements(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modalHeading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
