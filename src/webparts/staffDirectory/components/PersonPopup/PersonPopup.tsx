import * as React from "react";
import styles from "./PersonPopup.module.scss";
import { IPerson } from "../../interfaces/IPerson";
import { Avatar } from "@fluentui/react-components";
import {
  Mail20Regular,
  Chat20Regular,
  Video20Regular,
  Call20Regular
} from "@fluentui/react-icons";

export interface IPersonPopupProps {
  person: IPerson;
  onClose: () => void;
}

const PersonPopup: React.FC<IPersonPopupProps> = ({ person, onClose }) => {

  // EMAIL
  const handleEmail = () => {
    window.open(`mailto:${person.email}`, "_blank");
  };

  // TEAMS CHAT
  const handleTeamsChat = () => {
    const upn = person.email;
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${upn}`, "_blank");
  };

  // TEAMS VIDEO CALL
  const handleVideoCall = () => {
    const upn = person.email;
    window.open(`https://teams.microsoft.com/l/call/0/0?users=${upn}`, "_blank");
  };

  // TEAMS AUDIO CALL
  const handleCall = () => {
    const upn = person.email;
    window.open(`tel:${upn}`, "_blank");
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>

        <div className={styles.header}>
          <Avatar name={person.displayName} color="brand" size={56} />
          <div>
            <div className={styles.name}>{person.displayName}</div>
            <div>{person.department || "—"}</div>
          </div>
        </div>

        <div className={styles.actions}>
          <i title="Email" onClick={handleEmail}><Mail20Regular /></i>
          <i title="Teams Chat" onClick={handleTeamsChat}><Chat20Regular /></i>
          <i title="Teams Video Call" onClick={handleVideoCall}><Video20Regular /></i>
          <i title="Call" onClick={handleCall}><Call20Regular /></i>
        </div>

      </div>
    </div>
  );
};

export default PersonPopup;
