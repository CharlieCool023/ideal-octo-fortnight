import { useState } from "react";
import { useNavigate } from "react-router";
import { MoreVertical, Eye, Trash2, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import DeleteConfirmation from "@/components/DeleteConfirmation";
import { toast } from "sonner";

interface ActionsMenuProps {
  memberId: number;
  memberName: string;
  userRole?: string;
  onViewProfile?: (memberId: number) => void;
  onDeleteMember: (memberId: number) => Promise<void>;
  isDeleting?: boolean;
}

export default function ActionsMenu({
  memberId,
  memberName,
  userRole,
  onViewProfile,
  onDeleteMember,
  isDeleting = false,
}: ActionsMenuProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const canDeleteMember = userRole === "camp_commandant" || userRole === "super_admin";

  const handleViewProfile = () => {
    setIsOpen(false);
    if (onViewProfile) {
      onViewProfile(memberId);
    } else {
      navigate(`/profile/${memberId}`);
    }
  };

  const handlePrintProfile = () => {
    setIsOpen(false);
    // Open profile page in new tab so user can print without leaving dashboard
    window.open(`/profile/${memberId}`, "_blank");
  };

  const handleDelete = async () => {
    try {
      await onDeleteMember(memberId);
      toast.success(`${memberName} has been deleted successfully`);
      setShowDeleteConfirm(false);
      setIsOpen(false);
    } catch {
      toast.error("Failed to delete member. Please try again.");
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer">
            <Eye className="w-4 h-4 mr-2" />
            View Profile
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePrintProfile} className="cursor-pointer">
            <Printer className="w-4 h-4 mr-2" />
            Print Profile
          </DropdownMenuItem>

          {canDeleteMember && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => { setIsOpen(false); setShowDeleteConfirm(true); }}
                disabled={isDeleting}
                className="cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Member"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        memberName={memberName}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
