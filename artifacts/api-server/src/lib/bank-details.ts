import type { Outlet } from "@workspace/db";

export type BankDetails = {
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  bankTransferNote: string | null;
};

export function outletBankDetails(outlet: Pick<Outlet, keyof BankDetails>): BankDetails {
  return {
    bankName: outlet.bankName ?? null,
    bankAccountName: outlet.bankAccountName ?? null,
    bankAccountNumber: outlet.bankAccountNumber ?? null,
    bankBranch: outlet.bankBranch ?? null,
    bankTransferNote: outlet.bankTransferNote ?? null,
  };
}

export function hasConfiguredBankTransfer(outlet: Pick<Outlet, "bankAccountNumber" | "bankName">): boolean {
  return Boolean(outlet.bankAccountNumber?.trim() && outlet.bankName?.trim());
}
