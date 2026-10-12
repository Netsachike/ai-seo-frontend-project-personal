"use client";

import { useQuery } from "@tanstack/react-query";
import { MailIcon, RefreshCcwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import EmailMarketingService from "@/services/email-marketing";
import { accountKeys } from "@/features/account/query-keys";
import { EmptyState } from "@/components/brand/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TYPE_KEYS = ["individual", "bulk", "bulk_import"] as const;
type CampaignType = (typeof TYPE_KEYS)[number];

/** Campaign history from `GET /all/email/campaign`. */
export function CampaignTable() {
  const t = useTranslations("admin.marketing.history");
  const tType = useTranslations("admin.marketing.types");
  const format = useFormatter();
  const campaigns = useQuery({
    queryKey: accountKeys.campaigns(),
    retry: false,
    queryFn: async () => {
      try {
        const response = await EmailMarketingService.getEmailCampaigns();
        return response.data ?? [];
      } catch (error) {
        toast.error(getErrorMessage(error, t("loadFailed")));
        throw error;
      }
    },
  });
  const rows = campaigns.data ?? [];

  return (
    <Card className="p-0">
      <CardHeader className="px-5 pt-5">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <CardAction>
          <Button size="sm" disabled={campaigns.isFetching} onClick={() => void campaigns.refetch()}>
            <RefreshCcwIcon className={cn(campaigns.isFetching && "animate-spin")} />
            {t("refresh")}
          </Button>
        </CardAction>
      </CardHeader>

      {campaigns.isPending ? (
        <div className="flex flex-col gap-2 px-5 pb-5" aria-busy>
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState compact icon={MailIcon} title={t("emptyTitle")} description={t("emptyBody")} />
        </div>
      ) : (
        <Table containerClassName="border-t border-border">
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.subject")}</TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead className="text-end">{t("columns.sent")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead className="text-end">{t("columns.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((campaign) => {
              const isCompleted = campaign.status.toLowerCase() === "completed";
              const type = campaign.type as CampaignType;
              const knownType = (TYPE_KEYS as readonly string[]).includes(type);
              return (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium text-fg">{campaign.name}</TableCell>
                  <TableCell className="max-w-64 truncate text-fg-2">{campaign.subject}</TableCell>
                  <TableCell>
                    <Badge variant={type === "bulk" ? "warning" : type === "bulk_import" ? "blue" : "neutral"}>
                      {knownType ? tType(type) : campaign.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end num text-fg">
                    {t("sentValue", {
                      sent: format.number(Number(campaign.sent || 0), "integer"),
                      total: format.number(Number(campaign.total || 0), "integer"),
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isCompleted ? "success" : "warning"} shape="pill" className="capitalize">
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end text-fg-2">
                    {format.dateTime(new Date(campaign.created_at), "medium")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
