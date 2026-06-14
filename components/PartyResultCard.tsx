import { Party } from "@/lib/parties";

type Props = {
  party: Party & { score: number };
  rank: number;
  accentColor: "blue" | "emerald" | "amber";
};

const COLORS = {
  blue:    { highlight: "bg-blue-50 border-blue-300",       bar: "bg-blue-400",    score: "text-blue-700",   link: "text-blue-500"   },
  emerald: { highlight: "bg-emerald-50 border-emerald-300", bar: "bg-emerald-400", score: "text-emerald-700", link: "text-emerald-600" },
  amber:   { highlight: "bg-amber-50 border-amber-300",     bar: "bg-amber-400",   score: "text-amber-700",  link: "text-amber-600"  },
};

export default function PartyResultCard({ party, rank, accentColor }: Props) {
  const c = COLORS[accentColor];
  const isTop = rank === 0;

  return (
    <div className={`rounded-xl p-4 ${isTop ? `border-2 ${c.highlight}` : "bg-white border border-gray-200"}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="font-semibold">{rank + 1}. {party.name}</span>
          {party.subtitle && (
            <span className="text-xs text-gray-400 mr-2">({party.subtitle})</span>
          )}
        </div>
        <span className={`font-bold ${c.score}`}>{party.score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${party.score}%` }} />
      </div>
      <p className="text-xs text-gray-500 mb-2">{party.description}</p>
      <div className="flex gap-4 flex-wrap">
        {party.website ? (
          <a href={party.website} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            אתר המפלגה ↗
          </a>
        ) : (
          <span className="text-xs text-gray-300">אתר לא ידוע</span>
        )}
        {party.platformUrl ? (
          <a href={party.platformUrl} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            פלטפורמה רשמית ↗
          </a>
        ) : (
          <span className="text-xs text-gray-300">אין פלטפורמה מפורסמת</span>
        )}
      </div>
    </div>
  );
}
