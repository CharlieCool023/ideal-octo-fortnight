import { useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Search, ArrowLeft, CheckCircle, Send,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/providers/trpc";
import { useScrollPosition } from "@/hooks/useScrollPosition";

type Tab = "dashboard" | "platoon" | "comments";

export default function SoldierDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "dashboard") as Tab;
  const setTab = (t: Tab) => setSearchParams({ tab: t });

  return (
    <DashboardLayout requiredRole="soldier" title={tab === "dashboard" ? "Soldier" : tab.charAt(0).toUpperCase() + tab.slice(1)}>
      {tab === "dashboard" && <DashboardOverview onNavigate={setTab} />}
      {tab === "platoon" && <PlatoonTab />}
      {tab === "comments" && <PlatoonTab />}
    </DashboardLayout>
  );
}

function DashboardOverview({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: stats } = trpc.stats.dashboard.useQuery();

  const cards = [
    { label: "Total Members", value: stats?.totalMembers || 0, icon: <Users className="w-6 h-6" />, color: "bg-red-500", tab: "platoon" as Tab },
    { label: "Commented", value: stats?.processedCount || 0, icon: <CheckCircle className="w-6 h-6" />, color: "bg-green-500", tab: "comments" as Tab },
    { label: "Pending", value: stats?.pendingCount || 0, icon: <MessageSquare className="w-6 h-6" />, color: "bg-amber-500", tab: "platoon" as Tab },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.button
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(card.tab)}
            className="bg-white rounded-xl p-6 shadow-sm border text-left hover:shadow-md transition-shadow"
          >
            <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>{card.icon}</div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function PlatoonTab() {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const scrollContainerRef = useScrollPosition({ key: "soldier-platoon-list" });

  const { data: members, refetch } = trpc.corpsMembers.list.useQuery({
    search: search || undefined,
  });

  const { data: myComment } = trpc.comments.getMine.useQuery(
    { corpsMemberId: selectedMember! },
    { enabled: !!selectedMember }
  );

  const { data: allComments } = trpc.comments.list.useQuery(
    { corpsMemberId: selectedMember! },
    { enabled: !!selectedMember }
  );

  if (selectedMember) {
    const selectedMemberData = members?.find((m) => m.id === selectedMember);

    return (
      <CommentForm
        corpsMemberId={selectedMember}
        member={selectedMemberData}
        myComment={myComment}
        allComments={allComments || []}
        onBack={() => { setSelectedMember(null); refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-4 flex flex-col max-h-[calc(100vh-200px)]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {members?.map((m) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedMember(m.id)}
              className="bg-white rounded-xl p-4 shadow-sm border text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{m.surname} {m.otherNames}</p>
                  <p className="text-sm text-gray-500">{m.stateCode}</p>
                </div>
                {m.evaluationStatus.soldierComment ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Commented</span>
                ) : (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Pending</span>
                )}
              </div>
            </motion.button>
          )) || <p className="text-gray-400 text-center py-8 col-span-full">No members found</p>}
        </div>
      </div>
    </div>
  );
}

function CommentForm({
  corpsMemberId,
  member,
  myComment,
  allComments,
  onBack,
}: {
  corpsMemberId: number;
  member?: { surname: string; otherNames: string; stateCode: string; platoon: number };
  myComment: any;
  allComments: any[];
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const [showSuccess, setShowSuccess] = useState(false);
  const submitComment = trpc.comments.submit.useMutation({
    onSuccess: () => {
      utils.comments.getMine.invalidate();
      utils.comments.list.invalidate();
      setShowSuccess(true);
      window.setTimeout(onBack, 1500);
    }
  });

  const [comment, setComment] = useState(myComment?.comment || "");

  const handleSubmit = () => {
    if (!comment.trim()) return;
    submitComment.mutate({ corpsMemberId, comment: comment.trim() });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {showSuccess && (
        <SuccessPopup
          title={`${member ? `${member.surname} ${member.otherNames}` : "Corps member"} reviewed`}
          message="Observation saved successfully. Returning to the list..."
        />
      )}

      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to list
      </button>

      {member && (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">{member.surname} {member.otherNames}</h2>
          <p className="text-sm text-gray-500">{member.stateCode} | Platoon {member.platoon}</p>
        </div>
      )}

      {/* My Comment Form */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Add Observation</h2>
        <p className="text-sm text-gray-500 mb-4">Write your observations about this corps member</p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 h-32 resize-none"
          placeholder="Enter your observations here..."
        />

        <button
          onClick={handleSubmit}
          disabled={submitComment.isPending || !comment.trim()}
          className="mt-4 w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {submitComment.isPending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              {myComment ? "Update Comment" : "Submit Comment"}
            </>
          )}
        </button>
      </div>

      {/* Previous Comments */}
      {allComments.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">All Comments</h3>
          <div className="space-y-3">
            {allComments.map((c) => (
              <div key={c.id} className={`rounded-lg p-4 ${c.soldierId === myComment?.soldierId ? "bg-red-50 border border-red-200" : "bg-gray-50"}`}>
                <p className="text-sm text-gray-700">{c.comment}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {c.soldierId === myComment?.soldierId ? "Your comment" : "Another soldier"} • {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessPopup({ title, message }: { title: string; message: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
