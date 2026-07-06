import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Users, UserCog, Printer, Download, Plus, Search, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, ArrowLeft, Trash2, AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ActionsMenu from "@/components/ActionsMenu";
import { trpc } from "@/providers/trpc";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "dashboard" | "members" | "staff" | "batches" | "print" | "export";
type CampStaffRole = "platoon_instructor" | "man_o_war_instructor" | "soldier";
type CampStaffRoleFilter = "" | CampStaffRole;
type EvaluationSummary = {
  leadershipInitiative: number;
  professionalBearing: number;
  physicalFitness: number;
  communicationSkills: number;
  technicalCompetence: number;
  teamworkCooperation: number;
  reliabilityDependability: number;
  respectDignityRights: number;
  overallAverage: number | string;
};
type TextComment = { id: number; comment: string };
type MemberDetailRecord = {
  id: number;
  passportPhoto?: string | null;
  surname: string;
  otherNames: string;
  stateCode: string;
  callUpNumber: string;
  platoon: number;
  evaluations?: {
    platoonInstructor?: EvaluationSummary | null;
    manOWar?: EvaluationSummary | null;
  };
  comments?: TextComment[];
  commandantComments?: TextComment[];
};

export default function CampCommandantDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "dashboard") as Tab;
  const setTab = (t: Tab) => setSearchParams({ tab: t });

  return (
    <DashboardLayout requiredRole="camp_commandant" title={tab === "dashboard" ? "Camp Commandant" : tab.charAt(0).toUpperCase() + tab.slice(1)}>
      {tab === "dashboard" && <DashboardOverview onNavigate={setTab} />}
      {tab === "members" && <MembersTab />}
      {tab === "staff" && <StaffTab />}
      {tab === "batches" && <BatchesTab />}
      {tab === "print" && <PrintTab />}
      {tab === "export" && <ExportTab />}
    </DashboardLayout>
  );
}

function DashboardOverview({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: stats } = trpc.stats.dashboard.useQuery();

  const cards = [
    { label: "Corps Members", value: stats?.totalCorpsMembers || 0, icon: <Users className="w-6 h-6" />, color: "bg-green-500", tab: "members" as Tab },
    { label: "Started Evaluation", value: stats?.evaluatedCount || 0, icon: <CheckCircle className="w-6 h-6" />, color: "bg-blue-500", tab: "members" as Tab },
    { label: "Fully Evaluated", value: stats?.completedEvaluationCount || 0, icon: <CheckCircle className="w-6 h-6" />, color: "bg-cyan-600", tab: "members" as Tab },
    { label: "Comments", value: stats?.commentedCount || 0, icon: <Users className="w-6 h-6" />, color: "bg-purple-500", tab: "members" as Tab },
    { label: "Manage Staff", value: "View", icon: <UserCog className="w-6 h-6" />, color: "bg-amber-500", tab: "staff" as Tab },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

function MembersTab() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [platoonFilter, setPlatoonFilter] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [commentForm, setCommentForm] = useState({ corpsMemberId: 0, comment: "" });
  const [showCommentForm, setShowCommentForm] = useState(false);
  const scrollContainerRef = useScrollPosition({ key: `camp-commandant-members-page-${page}` });

  const { data: members, refetch } = trpc.corpsMembers.list.useQuery({
    search: search || undefined,
    platoon: platoonFilter,
    limit: 50,
    offset: page * 50,
  });

  const { data: memberDetail } = trpc.corpsMembers.get.useQuery(
    { id: selectedMemberId! },
    { enabled: !!selectedMemberId }
  );

  const utils = trpc.useUtils();
  const addComment = trpc.corpsMembers.addCommandantComment.useMutation({
    onSuccess: () => { refetch(); setShowCommentForm(false); setCommentForm({ corpsMemberId: 0, comment: "" }); }
  });
  const deleteMember = trpc.corpsMembers.delete.useMutation({
    onSuccess: async () => {
      // Invalidate cache so the list immediately reflects the deletion
      await Promise.all([
        utils.corpsMembers.list.invalidate(),
        utils.stats.dashboard.invalidate(),
      ]);
      setSelectedMemberId(null);
    }
  });

  const handleDeleteMember = async (memberId: number) => {
    await deleteMember.mutateAsync({ id: memberId });
  };

  if (selectedMemberId && memberDetail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedMemberId(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </button>
        <MemberDetail
          member={memberDetail}
          onAddComment={(id) => { setCommentForm({ corpsMemberId: id, comment: "" }); setShowCommentForm(true); }}
          showCommentForm={showCommentForm}
          commentForm={commentForm}
          setCommentForm={setCommentForm}
          onSubmitComment={() => addComment.mutate(commentForm)}
          isSubmitting={addComment.isPending}
          onPrint={() => navigate(`/profile/${selectedMemberId}`)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by name, state code, or call-up..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <select value={platoonFilter || ""} onChange={(e) => setPlatoonFilter(e.target.value ? parseInt(e.target.value) : undefined)} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
          <option value="">All Platoons</option>
          {Array.from({ length: 10 }, (_, i) => (<option key={i + 1} value={i + 1}>Platoon {i + 1}</option>))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col max-h-[calc(100vh-240px)]">
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">State Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Platoon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOW</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Soldier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members?.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      <div>{m.surname} {m.otherNames}</div>
                      <div className="text-xs text-gray-400 sm:hidden">{m.stateCode} · Platoon {m.platoon}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{m.stateCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">Platoon {m.platoon}</td>
                    <td className="px-4 py-3">{m.evaluationStatus.platoonInstructor ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-4 py-3">{m.evaluationStatus.manOWar ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{m.evaluationStatus.soldierComment ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-4 py-3">
                      <ActionsMenu
                        memberId={m.id}
                        memberName={`${m.surname} ${m.otherNames}`}
                        userRole={user?.role}
                        onViewProfile={setSelectedMemberId}
                        onDeleteMember={handleDeleteMember}
                        isDeleting={deleteMember.isPending}
                      />
                    </td>
                  </tr>
                )) || <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No members found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {members && members.length >= 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Previous</button>
            <span className="text-sm text-gray-500">Page {page + 1}</span>
            <button onClick={() => setPage(page + 1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">Next <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberDetail({
  member,
  onAddComment,
  showCommentForm,
  commentForm,
  setCommentForm,
  onSubmitComment,
  isSubmitting,
  onPrint,
}: {
  member: MemberDetailRecord;
  onAddComment: (id: number) => void;
  showCommentForm: boolean;
  commentForm: { corpsMemberId: number; comment: string };
  setCommentForm: (f: { corpsMemberId: number; comment: string }) => void;
  onSubmitComment: () => void;
  isSubmitting: boolean;
  onPrint: () => void;
}) {
  // corpsMembers.get returns the member fields directly at top level
  // plus: institutions, evaluations: { platoonInstructor, manOWar }, comments, commandantComments
  const piEval = member.evaluations?.platoonInstructor;
  const mowEval = member.evaluations?.manOWar;
  const comments = member.comments ?? [];
  const commandantComments = member.commandantComments ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex items-start gap-4 w-full">
            {member.passportPhoto ? (
              <img src={member.passportPhoto} alt="" className="w-20 h-20 rounded-lg object-cover border flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Users className="w-10 h-10 text-gray-400" /></div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-800">{member.surname} {member.otherNames}</h2>
              <p className="text-gray-500 text-sm">{member.stateCode} | {member.callUpNumber}</p>
              <p className="text-gray-500 text-sm">Platoon {member.platoon}</p>
            </div>
          </div>
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex-shrink-0 w-full sm:w-auto justify-center"
          >
            <Printer className="w-4 h-4" /> Print Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PI Evaluation */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">Platoon Instructor Evaluation</h3>
          {piEval ? (
            <div className="space-y-2 text-sm">
              <EvalRow label="Leadership & Initiative" value={piEval.leadershipInitiative} />
              <EvalRow label="Professional Bearing" value={piEval.professionalBearing} />
              <EvalRow label="Physical Fitness" value={piEval.physicalFitness} />
              <EvalRow label="Communication Skills" value={piEval.communicationSkills} />
              <EvalRow label="Technical Competence" value={piEval.technicalCompetence} />
              <EvalRow label="Teamwork & Cooperation" value={piEval.teamworkCooperation} />
              <EvalRow label="Reliability & Dependability" value={piEval.reliabilityDependability} />
              <EvalRow label="Respect for Dignity & Rights" value={piEval.respectDignityRights} />
              <div className="flex justify-between pt-2 border-t font-bold text-base">
                <span>Overall Average</span>
                <span className="text-green-600">{piEval.overallAverage}</span>
              </div>
            </div>
          ) : <p className="text-gray-400 text-sm">Not evaluated yet</p>}
        </div>

        {/* MOW Evaluation */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4">Man O'War Evaluation</h3>
          {mowEval ? (
            <div className="space-y-2 text-sm">
              <EvalRow label="Leadership & Initiative" value={mowEval.leadershipInitiative} />
              <EvalRow label="Professional Bearing" value={mowEval.professionalBearing} />
              <EvalRow label="Physical Fitness" value={mowEval.physicalFitness} />
              <EvalRow label="Communication Skills" value={mowEval.communicationSkills} />
              <EvalRow label="Technical Competence" value={mowEval.technicalCompetence} />
              <EvalRow label="Teamwork & Cooperation" value={mowEval.teamworkCooperation} />
              <EvalRow label="Reliability & Dependability" value={mowEval.reliabilityDependability} />
              <EvalRow label="Respect for Dignity & Rights" value={mowEval.respectDignityRights} />
              <div className="flex justify-between pt-2 border-t font-bold text-base">
                <span>Overall Average</span>
                <span className="text-green-600">{mowEval.overallAverage}</span>
              </div>
            </div>
          ) : <p className="text-gray-400 text-sm">Not evaluated yet</p>}
        </div>
      </div>

      {/* Soldier Comments */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-800 mb-4">Soldier Comments</h3>
        {comments.length > 0 ? (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-gray-700">{c.comment}</p></div>
            ))}
          </div>
        ) : <p className="text-gray-400 text-sm">No comments yet</p>}
      </div>

      {/* Commandant Comments */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-800 mb-4">Commandant Comments</h3>
        {commandantComments.length > 0 ? (
          <div className="space-y-3">
            {commandantComments.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm"><p className="text-gray-700">{c.comment}</p></div>
            ))}
          </div>
        ) : <p className="text-gray-400 text-sm">No commandant comments yet</p>}
        {!showCommentForm && (
          <button onClick={() => onAddComment(member.id)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Comment
          </button>
        )}
        {showCommentForm && (
          <div className="mt-4 space-y-3">
            <textarea value={commentForm.comment} onChange={(e) => setCommentForm({ ...commentForm, comment: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 h-24" placeholder="Enter your comment..." />
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={onSubmitComment} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">{isSubmitting ? "Submitting..." : "Submit"}</button>
              <button onClick={() => setCommentForm({ corpsMemberId: 0, comment: "" })} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EvalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium sm:text-right">{value}/10</span>
    </div>
  );
}

function StaffTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<CampStaffRoleFilter>("");
  const [showForm, setShowForm] = useState(false);
  const { data: allStaff, refetch } = trpc.users.list.useQuery({ search: search || undefined, role: roleFilter || undefined });
  const [staffError, setStaffError] = useState("");
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      setStaffError("");
      refetch();
      setShowForm(false);
    },
    onError: (err) => {
      setStaffError(err.message || "Staff account could not be created. Please check the details and try again.");
    },
  });
  const toggleUser = trpc.users.update.useMutation({ onSuccess: () => refetch() });
  const hardDelete = trpc.users.hardDelete.useMutation({ onSuccess: () => refetch() });

  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "platoon_instructor" as "platoon_instructor" | "man_o_war_instructor" | "soldier", assignedPlatoon: 1, assignedBatchId: undefined as number | undefined });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; role: string } | null>(null);

  const platoonStaff = allStaff?.filter((u) => u.role === "platoon_instructor" || u.role === "man_o_war_instructor" || u.role === "soldier") || [];
  const existingAssignment = platoonStaff.find(
    (u) =>
      u.isActive &&
      u.role === form.role &&
      u.assignedPlatoon === form.assignedPlatoon
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" /> Create Staff
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-xl p-6 shadow-sm border space-y-4" onSubmit={(e) => { e.preventDefault(); setStaffError(""); createUser.mutate({ ...form, assignedPlatoon: form.assignedPlatoon }, { onSuccess: () => setForm({ fullName: "", username: "", password: "", role: "platoon_instructor", assignedPlatoon: 1, assignedBatchId: undefined }) }); }}>
          <h3 className="font-semibold text-gray-800">Create Staff Member</h3>
          {staffError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {staffError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CampStaffRole })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
              <option value="platoon_instructor">Platoon Instructor</option>
              <option value="man_o_war_instructor">Man O'War Instructor</option>
              <option value="soldier">Soldier</option>
            </select>
            <select value={form.assignedPlatoon} onChange={(e) => setForm({ ...form, assignedPlatoon: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
              {Array.from({ length: 10 }, (_, i) => (<option key={i + 1} value={i + 1}>Platoon {i + 1}</option>))}
            </select>
          </div>
          {existingAssignment && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <p>
                {existingAssignment.fullName} is the active {form.role.replace(/_/g, " ")} for Platoon {form.assignedPlatoon}.
                Creating this account will deactivate that existing account.
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={createUser.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{createUser.isPending ? "Creating..." : "Create"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </motion.form>
      )}

      <div className="flex flex-wrap gap-2">
        {(["", "platoon_instructor", "man_o_war_instructor", "soldier"] as CampStaffRoleFilter[]).map((r) => (
          <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1 rounded-full text-sm ${roleFilter === r ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {r === "" ? "All" : r === "platoon_instructor" ? "Platoon Instructors" : r === "man_o_war_instructor" ? "Man O'War" : "Soldiers"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platoon</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {platoonStaff.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    <div>{u.fullName}</div>
                    <div className="text-xs text-gray-400 md:hidden">{u.role.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell capitalize">{u.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">P{u.assignedPlatoon}</td>
                  <td className="px-4 py-3">{u.isActive ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span> : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleUser.mutate({ id: u.id, isActive: u.isActive ? 0 : 1 })} className="text-sm text-blue-600 hover:text-blue-700">
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: u.id, name: u.fullName, role: u.role })}
                        className="text-red-500 hover:text-red-700"
                        title="Permanently delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {platoonStaff.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No staff found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <AlertDialogTitle>Delete Staff Account</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  You are about to permanently delete{" "}
                  <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>'s account
                  ({deleteTarget?.role.replace(/_/g, " ")}).
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-xs">
                    <span className="font-semibold">This is permanent.</span> The account will be removed
                    from the system entirely and their login will stop working immediately.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={hardDelete.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                hardDelete.mutate({ id: deleteTarget.id }, { onSuccess: () => setDeleteTarget(null) });
              }}
              disabled={hardDelete.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {hardDelete.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchesTab() {
  const utils = trpc.useUtils();
  const { data: batches, refetch } = trpc.batches.list.useQuery();
  const createBatch = trpc.batches.create.useMutation({ onSuccess: () => refetch() });
  const activate = trpc.batches.activate.useMutation({
    onSuccess: () => {
      refetch();
      utils.stats.dashboard.invalidate();
      utils.corpsMembers.list.invalidate();
    }
  });
  const [form, setForm] = useState({ name: "", year: new Date().getFullYear(), state: "ondo" as "ondo" | "lagos", description: "" });
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Batches</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Batch
        </button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-xl p-6 shadow-sm border space-y-4" onSubmit={(e) => { e.preventDefault(); createBatch.mutate(form, { onSuccess: () => { setShowForm(false); setForm({ name: "", year: new Date().getFullYear(), state: "ondo", description: "" }); } }); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Batch Name (e.g. Batch C)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="number" placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value as "ondo" | "lagos" })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
              <option value="ondo">Ondo</option>
              <option value="lagos">Lagos</option>
            </select>
          </div>
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={createBatch.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{createBatch.isPending ? "Creating..." : "Create"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </motion.form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches?.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    <div>{b.name}</div>
                    <div className="text-xs text-gray-400 sm:hidden">{b.year} · {b.state}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{b.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize hidden sm:table-cell">{b.state}</td>
                  <td className="px-4 py-3">{b.isActive ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span> : <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>}</td>
                  <td className="px-4 py-3">
                    {!b.isActive && (
                      <button onClick={() => activate.mutate({ id: b.id })} disabled={activate.isPending} className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50">
                        {activate.isPending ? "Activating..." : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              )) || <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No batches found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PrintTab() {
  const navigate = useNavigate();
  const [selectedPlatoon, setSelectedPlatoon] = useState(1);
  const { data: activeBatch } = trpc.batches.getActive.useQuery();
  const { data: report } = trpc.export.platoonReport.useQuery(
    { platoon: selectedPlatoon },
    { enabled: !!activeBatch }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {!activeBatch && <div className="text-amber-600 font-semibold">No active batch available</div>}
        {activeBatch && <div className="text-gray-600 font-semibold">Batch: {activeBatch.name}</div>}
        <select value={selectedPlatoon} onChange={(e) => setSelectedPlatoon(parseInt(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
          {Array.from({ length: 10 }, (_, i) => (<option key={i + 1} value={i + 1}>Platoon {i + 1}</option>))}
        </select>
      </div>

      {report && report.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Click a member's row to open their printable profile. Each profile prints as an individual page with all evaluation details and a space for the Camp Commandant's signature.
          </p>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">State Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MOW Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Final</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{m.surname} {m.otherNames}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{m.stateCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.piScore || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{m.mowScore || "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800 hidden sm:table-cell">{m.finalScore || "-"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/profile/${m.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        activeBatch && <p className="text-gray-400 text-center py-12">No corps members in Platoon {selectedPlatoon}</p>
      )}
    </div>
  );
}

function ExportTab() {
  const [selectedBatch, setSelectedBatch] = useState<number | undefined>();
  const { data: batches } = trpc.batches.list.useQuery();
  const { data: csvData } = trpc.export.csv.useQuery(
    selectedBatch ? { batchId: selectedBatch } : undefined,
    { enabled: true }
  );

  const downloadCSV = () => {
    if (!csvData?.csv) return;
    const blob = new Blob([csvData.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvData.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Corps Members Data</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selectedBatch || ""} onChange={(e) => setSelectedBatch(e.target.value ? parseInt(e.target.value) : undefined)} className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Batches</option>
            {batches?.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
          <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors justify-center">
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
