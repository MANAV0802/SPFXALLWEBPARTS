import * as React from "react";
import { WebPartTitle } from "@pnp/spfx-controls-react/lib/WebPartTitle";
import { IOrganizationChartProps } from "./IOrganizationChartProps";
import * as strings from "OrganizationChartWebPartStrings";
import {
  Persona,
  PersonaSize,
  PersonaPresence,
  DocumentCard,
  IPersonaStyles,
  mergeStyleSets,
  IDocumentCardStyles,
  Spinner,
  SpinnerSize,
  Stack,
  IPersonaProps,
  Label,
  MessageBar,
  MessageBarType,
} from "@fluentui/react";

import { IAppContext } from "../Entities/IAppContext";
import { IUserInfo } from "../Entities/IUserInfo";
import { useState, useEffect } from "react";
import { useGetUserProperties } from "../../../hooks/useGetUserProperties";
import { IOrganizationChartState } from "./IOrganizationChartState";

/* ================= Persona styles ================= */

const personaStyles: Partial<IPersonaStyles> = {
  primaryText: {
    fontSize: 14,
    fontWeight: 500,
  },
};

/* ================= Presence mapping ================= */

const presenceStatus: Record<string, PersonaPresence> = {
  Available: PersonaPresence.online,
  AvailableIdle: PersonaPresence.online,
  Away: PersonaPresence.away,
  BeRightBack: PersonaPresence.away,
  Busy: PersonaPresence.busy,
  BusyIdle: PersonaPresence.busy,
  DoNotDisturb: PersonaPresence.dnd,
  Offline: PersonaPresence.offline,
  PresenceUnknown: PersonaPresence.none,
};

/* ================= Component ================= */

export const OrganizationChart: React.FC<IOrganizationChartProps> = (props) => {
  /* ---------- SAFE THEME ---------- */
  const palette = props.themeVariant?.palette;

  /* ---------- TIMER ---------- */
  let timerId: ReturnType<typeof setInterval> | undefined;

  /* ---------- CONTEXT ---------- */
  const applicationContext: IAppContext = {
    currentUser: props.currentUser,
    context: props.context,
  };

  /* ---------- STATE ---------- */
  const [state, setState] = useState<IOrganizationChartState>({
    isloading: true,
    hasError: false,
    errorMessage: "",
    managerList: [],
    userProfile: undefined,
    reportsList: [],
  });

  /* ================= STYLES ================= */

  const stylesComponent = mergeStyleSets({
    container: {
      minWidth: 257,
      maxWidth: 300,
      maxHeight: 620,
      overflow: "auto",
      padding: 10,
      paddingBottom: 20,
    },
    managerList: {
      marginLeft: 30,
      paddingBottom: 40,
      borderLeft: `2px solid ${palette?.neutralQuaternary ?? "#d0d0d0"}`,
      borderBottom: `2px solid ${palette?.neutralQuaternary ?? "#d0d0d0"}`,
    },
    currentUser: {
      marginLeft: 75,
      borderLeft:
        state.reportsList.length > 0
          ? `2px solid ${palette?.neutralQuaternary ?? "#d0d0d0"}`
          : "none",
    },
    directReportList: {
      marginLeft: 85,
    },
    directReportInfo: {
      width: "70%",
      padding: 5,
      marginTop: 20,
      backgroundColor: palette?.neutralLight ?? "#f3f2f1",
    },
  });

  const cardHover = {
    ":hover": {
      backgroundColor: palette?.themeLighter ?? "#edebe9",
    },
    ":hover::after": {
      border: "none",
    },
  };

  const documentCardStyles: Partial<IDocumentCardStyles> = {
    root: {
      marginTop: 15,
      padding: 5,
      border: "none",
      selectors: cardHover,
    },
  };

  /* ================= HELPERS ================= */

  const onRenderCoin = (props: IPersonaProps): JSX.Element => (
    <img
      src={props.imageUrl}
      alt={props.imageAlt}
      width={props.coinSize}
      height={props.coinSize}
      style={{
        borderRadius: "50%",
        border: `2px solid ${palette?.neutralTertiary ?? "#c8c6c4"}`,
      }}
    />
  );

  const renderPersona = (user: IUserInfo) => (
    <DocumentCard key={user.email} styles={documentCardStyles} onClickHref={user.userUrl}>
      <Persona
        styles={personaStyles}
        imageUrl={user.pictureUrl}
        text={user.displayName}
        secondaryText={user.title}
        size={PersonaSize.size40}
        onRenderCoin={onRenderCoin}
        presence={
          presenceStatus[user.presence?.availability ?? "PresenceUnknown"]
        }
        presenceTitle={user.presence?.activity ?? "Unknown"}
      />
    </DocumentCard>
  );

  /* ================= DATA LOAD ================= */

  useEffect(() => {
    (async () => {
      try {
        const loginName = applicationContext.currentUser?.loginName;
        if (!loginName) {
          throw new Error("Login name not available");
        }

        const {
          _managersList,
          _currentUserProfile,
          _reportsList,
          getPresenceStatus,
        } = await useGetUserProperties(loginName, applicationContext.context);

        setState({
          isloading: false,
          hasError: false,
          errorMessage: "",
          managerList: _managersList,
          reportsList: _reportsList,
          userProfile: _currentUserProfile,
        });

        if (timerId) clearInterval(timerId);

        timerId = setInterval(async () => {
          const updated = await getPresenceStatus(
            _managersList,
            _reportsList,
            _currentUserProfile
          );

          setState({
            isloading: false,
            hasError: false,
            errorMessage: "",
            managerList: updated.managersList,
            reportsList: updated.reportsList,
            userProfile: updated.currentUserProfile,
          });
        }, props.refreshInterval * 60000);
      } catch (err: any) {
        setState({
          isloading: false,
          hasError: true,
          errorMessage: `${strings.errorMessage} ${err.message}`,
          managerList: [],
          reportsList: [],
          userProfile: undefined,
        });
      }
    })();

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [props.refreshInterval, props.title]);

  /* ================= RENDER ================= */

  return (
    <div className={stylesComponent.container}>
      <WebPartTitle
        displayMode={props.displayMode}
        title={props.title}
        updateProperty={props.updateProperty}
        themeVariant={props.themeVariant}
      />

      {state.isloading ? (
        <Stack horizontalAlign="center">
          <Spinner size={SpinnerSize.small} label="Loading..." />
        </Stack>
      ) : state.hasError ? (
        <MessageBar messageBarType={MessageBarType.error}>
          {state.errorMessage}
        </MessageBar>
      ) : (
        <>
          <div className={stylesComponent.managerList}>
            {state.managerList.map(renderPersona)}
          </div>

          {state.userProfile && (
            <>
              {renderPersona(state.userProfile)}
              {state.reportsList.length > 0 && (
                <div className={stylesComponent.directReportInfo}>
                  <Label>
                    Direct Reports ({state.reportsList.length})
                  </Label>
                </div>
              )}
            </>
          )}

          <div className={stylesComponent.directReportList}>
            {state.reportsList.map(renderPersona)}
          </div>
        </>
      )}
    </div>
  );
};
