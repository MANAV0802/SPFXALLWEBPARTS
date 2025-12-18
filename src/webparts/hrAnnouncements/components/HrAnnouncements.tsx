import * as React from "react";
import { useEffect, useState } from "react";

import { spfi, SPFI } from "@pnp/sp";
import { SPFx } from "@pnp/sp/behaviors/spfx";

import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

import { WebPartContext } from "@microsoft/sp-webpart-base";
import { Stack, Text, Icon, Separator, Modal } from "@fluentui/react";

import styles from "./HrAnnouncements.module.scss";

/* =======================
   Interfaces
======================= */
export interface IAnnouncement {
  Id: number;
  Title: string;
  Body?: string;
  AnnouncementDate?: string;
  EndDate?: string;
  IsPinned?: boolean;
  Author?: {
    Title: string;
  };
}

export interface IHrAnnouncementsProps {
  context: WebPartContext;
}

/* =======================
   Component
======================= */
const HrAnnouncements: React.FC<IHrAnnouncementsProps> = ({ context }) => {

  const [items, setItems] = useState<IAnnouncement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<IAnnouncement | null>(null);

  const sp: SPFI = spfi().using(SPFx(context));

  useEffect(() => {
    const loadAnnouncements = async (): Promise<void> => {
      try {
        const today = new Date();

        const data: IAnnouncement[] = await sp.web.lists
          .getByTitle("Announcements")
          .items
          .select(
            "Id",
            "Title",
            "Body",
            "AnnouncementDate",
            "EndDate",
            "IsPinned",
            "Author/Title"
          )
          .expand("Author")
          .orderBy("IsPinned", false)
          .orderBy("AnnouncementDate", false)
          .top(20)();

        const filtered = data.filter(item => {
          const endDateValid =
            !item.EndDate || new Date(item.EndDate) >= today;
          return endDateValid;
        });

        setItems(filtered);
      } catch (err) {
        console.error("❌ Error loading announcements", err);
      } finally {
        setLoading(false);
      }
    };

    void loadAnnouncements();
  }, [context]);

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <Icon iconName="Megaphone" className={styles.headerIcon} />
        <Text variant="xLarge">HR Announcements</Text>
      </div>

      {loading && <Text>Loading announcements...</Text>}

      {!loading && items.length === 0 && (
        <Text className={styles.emptyText}>
          No active announcements.
        </Text>
      )}

      {/* Cards */}
      <Stack tokens={{ childrenGap: 14 }}>
        {items.map(item => (
          <div
            key={item.Id}
            className={`${styles.card} ${item.IsPinned ? styles.pinned : ""}`}
            onClick={() => setSelectedItem(item)}
          >
            <Text variant="large" className={styles.title}>
              {item.Title}
              {item.IsPinned && <span className={styles.pinBadge}>📌</span>}
              <span className={styles.newBadge}>NEW</span>
            </Text>

            {item.Body && (
              <div
                className={styles.description}
                dangerouslySetInnerHTML={{
                  __html:
                    item.Body.length > 120
                      ? item.Body.substring(0, 120) + "..."
                      : item.Body
                }}
              />
            )}

            <Separator />

            <Stack horizontal tokens={{ childrenGap: 16 }}>
              {item.AnnouncementDate && (
                <Text variant="small" className={styles.date}>
                  📅 {new Date(item.AnnouncementDate).toDateString()}
                </Text>
              )}

              {item.Author?.Title && (
                <Text variant="small">
                  👤 {item.Author.Title}
                </Text>
              )}
            </Stack>
          </div>
        ))}
      </Stack>

      {/* Modal */}
{/* Modal */}
<Modal
  isOpen={!!selectedItem}
  onDismiss={() => setSelectedItem(null)}
  isBlocking={false}
  containerClassName={styles.popupContainer}
>
  {selectedItem && (
    <div className={styles.popupContent}>

      {/* HEADER */}
<div className={styles.popupHeader}>
  <div className={styles.popupTitleRow}>
    <Icon iconName="Info" className={styles.popupIcon} />
    <Text variant="xLarge" className={styles.popupTitle}>
      {selectedItem.Title}
    </Text>
  </div>
</div>

      {/* META */}
      <div className={styles.popupMeta}>
        {selectedItem.AnnouncementDate && (
          <span>📅 {new Date(selectedItem.AnnouncementDate).toDateString()}</span>
        )}
        {selectedItem.Author?.Title && (
          <span>👤 {selectedItem.Author.Title}</span>
        )}
      </div>

      <Separator />

      {/* BODY */}
      <div
        className={styles.popupBody}
        dangerouslySetInnerHTML={{ __html: selectedItem.Body || "" }}
      />

      {/* FOOTER */}
      <div className={styles.popupFooter}>
        <button
          className={styles.popupCloseBtn}
          onClick={() => setSelectedItem(null)}
        >
          Close
        </button>
      </div>

    </div>
  )}
</Modal>

    </div>
  );
};

export default HrAnnouncements;
