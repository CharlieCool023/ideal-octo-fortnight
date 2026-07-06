import { useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import {
  Users,
  UserCog,
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Lock,
  Download,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
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

type Tab = "dashboard" | "commandants" | "batches" | "users" | "settings";

export default function SuperAdminDashboard() {
  const [searchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "dashboard") as Tab;

  return (
    <DashboardLayout requiredRole="super_admin" title={tab === "dashboard" ? "Super Admin Dashboard" : tab.charAt(0).toUpperCase() + tab.slice(1)}>
      {tab === "dashboard" && <DashboardOverview />}
      {tab === "commandants" && <CommandantsTab />}
      {tab === "batches" && <BatchesTab />}
      {tab === "users" && <AllUsersTab />}
      {tab === "settings" && <SettingsTab />}
    </DashboardLayout>
  );
}

function DashboardOverview() {
  const { data: stats } = trpc.stats.dashboard.useQuery();

  const cards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: <Users className="w-6 h-6" />, color: "bg-blue-500" },
    { label: "Commandants", value: stats?.totalCommandants || 0, icon: <UserCog className="w-6 h-6" />, color: "bg-purple-500" },
    { label: "Total Batches", value: stats?.totalBatches || 0, icon: <BookOpen className="w-6 h-6" />, color: "bg-amber-500" },
    { label: "Corps Members", value: stats?.totalCorpsMembers || 0, icon: <Users className="w-6 h-6" />, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border"
          >
            <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {stats?.activeBatch && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Batch</h3>
          <p className="text-gray-600">
            <span className="font-medium">{stats.activeBatch.name}</span> ({stats.activeBatch.state})
          </p>
        </div>
      )}
    </div>
  );
}

function CommandantsTab() {
  const utils = trpc.useUtils();
  const { data: users, refetch } = trpc.users.list.useQuery({ role: "camp_commandant" });
  const { data: stateCmdts } = trpc.users.list.useQuery({ role: "state_commandant" });
  const createUser = trpc.users.create.useMutation({ onSuccess: () => { refetch(); utils.users.list.invalidate(); } });

  const [form, setForm] = useState({ fullName: "", username: "", password: "", role: "camp_commandant" as const, state: "ondo" as "ondo" | "lagos" });
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ fullName: "", username: "", password: "", role: "camp_commandant", state: "ondo" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Commandants</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white rounded-xl p-6 shadow-sm border space-y-4"
          onSubmit={handleCreate}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "camp_commandant" })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
              <option value="camp_commandant">Camp Commandant</option>
              <option value="state_commandant">State Commandant</option>
            </select>
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value as "ondo" | "lagos" })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500">
              <option value="ondo">Ondo</option>
              <option value="lagos">Lagos</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={createUser.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {createUser.isPending ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Camp Commandants */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b"><h3 className="font-semibold text-gray-800">Camp Commandants</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{u.state}</td>
                  <td className="px-4 py-3">{u.isActive ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span> : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>}</td>
                </tr>
              )) || <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No commandants found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Commandants */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b"><h3 className="font-semibold text-gray-800">State Commandants</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stateCmdts?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{u.state}</td>
                  <td className="px-4 py-3">{u.isActive ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span> : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>}</td>
                </tr>
              )) || <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No state commandants found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BatchesTab() {
  const utils = trpc.useUtils();
  const { data: batches, refetch } = trpc.batches.list.useQuery();
  const createBatch = trpc.batches.create.useMutation({ onSuccess: () => refetch() });
  const activate = trpc.batches.activate.useMutation({
    onSuccess: () => { refetch(); utils.stats.dashboard.invalidate(); }
  });
  const deactivate = trpc.batches.deactivate.useMutation({
    onSuccess: () => { refetch(); utils.stats.dashboard.invalidate(); }
  });
  const deleteBatch = trpc.batches.delete.useMutation({
    onSuccess: () => { refetch(); utils.stats.dashboard.invalidate(); }
  });

  const [form, setForm] = useState({ name: "", year: new Date().getFullYear(), state: "ondo" as "ondo" | "lagos", description: "" });
  const [showForm, setShowForm] = useState(false);

  // Delete flow state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [csvDownloaded, setCsvDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const csvQuery = trpc.export.csv.useQuery(
    { batchId: deleteTarget?.id ?? 0 },
    { enabled: false } // only fetch on demand
  );

  const handleDownloadCsv = async () => {
    if (!deleteTarget) return;
    setIsDownloading(true);
    try {
      const result = await csvQuery.refetch();
      if (result.data?.csv) {
        const blob = new Blob([result.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        a.click();
        URL.revokeObjectURL(url);
        setCsvDownloaded(true);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenDelete = (id: number, name: string) => {
    setDeleteTarget({ id, name });
    setCsvDownloaded(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteBatch.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        setDeleteTarget(null);
        setCsvDownloaded(false);
      }
    });
  };

  const batchCount = batches?.length ?? 0;
  const atLimit = batchCount >= 3;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Batches</h2>
          <p className="text-xs text-gray-400 mt-0.5">{batchCount}/3 batches used</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={atLimit}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={atLimit ? "Delete an existing batch to create a new one" : undefined}
        >
          <Plus className="w-4 h-4" />
          Create Batch
        </button>
      </div>

      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Maximum of 3 batches reached. You must download and delete an existing batch before creating a new one.
          </p>
        </div>
      )}

      {showForm && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-white rounded-xl p-6 shadow-sm border space-y-4" onSubmit={(e) => { e.preventDefault(); createBatch.mutate(form, { onSuccess: () => { setShowForm(false); setForm({ name: "", year: new Date().getFullYear(), state: "ondo", description: "" }); } }); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Batch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
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
                  <td className="px-4 py-3">
                    {b.isActive
                      ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                      : <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {b.isActive ? (
                        <button onClick={() => deactivate.mutate({ id: b.id })} className="text-amber-600 hover:text-amber-700" title="Deactivate">
                          <XCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => activate.mutate({ id: b.id })} className="text-green-600 hover:text-green-700" title="Activate">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenDelete(b.id, b.name)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) || <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No batches found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setCsvDownloaded(false); } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <AlertDialogTitle>Delete Batch: {deleteTarget?.name}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  This will <span className="font-semibold text-red-700">permanently delete</span> this
                  batch along with <span className="font-semibold">all corps members, evaluations, comments,
                  and education records</span> in it. This cannot be undone.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="font-semibold text-amber-800 mb-2">Step 1 — Download the data first</p>
                  <p className="text-amber-700 text-xs mb-3">
                    You must download the CSV backup before the delete button is enabled.
                    This is your only chance to keep a record of this batch.
                  </p>
                  <button
                    onClick={handleDownloadCsv}
                    disabled={isDownloading || csvDownloaded}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full justify-center ${
                      csvDownloaded
                        ? "bg-green-100 text-green-700 cursor-default"
                        : "bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? "Downloading..." : csvDownloaded ? "✓ CSV Downloaded" : "Download CSV Backup"}
                  </button>
                </div>
                {csvDownloaded && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="font-semibold text-red-800">Step 2 — Confirm permanent deletion</p>
                    <p className="text-red-700 text-xs mt-1">The delete button below is now unlocked. Proceed only if you are absolutely certain.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBatch.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!csvDownloaded || deleteBatch.isPending}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleteBatch.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AllUsersTab() {
  const [search, setSearch] = useState("");
  const { data: users, refetch } = trpc.users.list.useQuery({ search: search || undefined });
  const toggleActive = trpc.users.update.useMutation({ onSuccess: () => refetch() });
  const hardDelete = trpc.users.hardDelete.useMutation({ onSuccess: () => refetch() });

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; role: string } | null>(null);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by name or username..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    <div>{u.fullName}</div>
                    <div className="text-xs text-gray-400 md:hidden capitalize">{u.role.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize hidden md:table-cell">{u.role.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                      : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.role !== "super_admin" && (
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, isActive: u.isActive ? 0 : 1 })}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                      {u.role !== "super_admin" && (
                        <button
                          onClick={() => setDeleteTarget({ id: u.id, name: u.fullName, role: u.role })}
                          className="text-red-500 hover:text-red-700"
                          title="Permanently delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) || <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
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
                    from the system entirely. Any evaluations or comments they submitted will remain
                    attributed to their records but their login will stop working immediately.
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

function SettingsTab() {
  const { user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePassword = trpc.customAuth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (err) => setPasswordError(err.message),
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    changePassword.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">System Settings</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b"><span className="text-gray-500">System Name</span><span className="font-medium sm:text-right">NYSC Camp Evaluation System</span></div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b"><span className="text-gray-500">Admin Name</span><span className="font-medium sm:text-right">{user?.fullName}</span></div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b"><span className="text-gray-500">Admin Role</span><span className="font-medium sm:text-right">Super Admin</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
        {!showPasswordForm ? (
          <button onClick={() => setShowPasswordForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-600 text-sm">Password changed successfully!</p>}
            <input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <input type="password" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" required />
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="submit" disabled={changePassword.isPending} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {changePassword.isPending ? "Changing..." : "Change"}
              </button>
              <button type="button" onClick={() => setShowPasswordForm(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
