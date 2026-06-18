import { Party } from "@/lib/parties";

type Props = {
  party: Party & { score: number };
  rank: number;
  accentColor: "blue" | "emerald" | "amber" | "purple" | "teal";
  aiBlurb?: string;
  aiLoading?: boolean;
};

const COLORS = {
  blue:    { highlight: "bg-blue-50 border-blue-300",       bar: "bg-blue-400",    score: "text-blue-700",    link: "text-blue-500"   },
  emerald: { highlight: "bg-emerald-50 border-emerald-300", bar: "bg-emerald-400", score: "text-emerald-700", link: "text-emerald-600" },
  amber:   { highlight: "bg-amber-50 border-amber-300",     bar: "bg-amber-400",   score: "text-amber-700",   link: "text-amber-600"  },
  purple:  { highlight: "bg-purple-50 border-purple-300",   bar: "bg-purple-400",  score: "text-purple-700",  link: "text-purple-600" },
  teal:    { highlight: "bg-teal-50 border-teal-300",       bar: "bg-teal-400",    score: "text-teal-700",    link: "text-teal-600"   },
};

export default function PartyResultCard({ party, rank, accentColor, aiBlurb, aiLoading }: Props) {
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
      {(aiLoading || aiBlurb) && (
        <div className="mt-1 mb-2 pt-2 border-t border-gray-100">
          {aiLoading && !aiBlurb ? (
            <p className="text-xs text-indigo-300 animate-pulse">✦ מנתח התאמה...</p>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="text-indigo-400 ml-1">✦</span>{aiBlurb}
            </p>
          )}
        </div>
      )}
      <div className="flex gap-4 flex-wrap items-center">
        {party.website ? (
          <a href={party.website} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            אתר המפלגה ↗
          </a>
        ) : (
          <span className="text-xs text-gray-300">אתר לא ידוע</span>
        )}
        {party.platformUrl ? (
          <a href={party.platformUrl} target="_blank" rel="noopener noreferrer" className={`text-xs ${c.link} hover:underline`}>
            {party.platformLabel ?? "מצע רשמי"} ↗
          </a>
        ) : (
          <span className="text-xs text-red-400 font-medium">אין מצע מפורסם</span>
        )}
      </div>
    </div>
  );
}
