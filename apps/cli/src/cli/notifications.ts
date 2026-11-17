import { withContext, type GlobalOpts } from "./context";

interface NotificationListOpts extends GlobalOpts {
  unread?: boolean;
  limit?: string;
  /** `--ack` with no ids yields true; with ids yields the list. */
  ack?: boolean | string[];
}

export const list = (opts: NotificationListOpts) =>
  withContext(opts, async ({ notifications, output }) => {
    const limit = opts.limit === undefined ? undefined : Number(opts.limit);
    if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
      throw new Error("--limit 必须是正数");
    }
    const list = await notifications.list({ limit, unreadOnly: opts.unread });
    output.reminders(list);
  });

export const ack = (ids: string[], opts: NotificationListOpts) =>
  withContext(opts, async ({ notifications, output }) => {
    const acked = await notifications.ack(ids.length > 0 ? ids : undefined);
    const scope = ids.length > 0 ? `选中的 ${ids.length} 条` : "全部未读";
    output.ok(
      `已确认 ${acked} 条提醒（${scope}）`,
      {
        acked,
      },
    );
  });
