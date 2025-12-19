import { spfi, SPFx as spSPFx } from "@pnp/sp";
import "@pnp/sp/profiles";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { IUserInfo } from "../webparts/organizationChart/Entities/IUserInfo";
import { IUserPresence } from "../webparts/organizationChart/Entities/IUserPresence";
import * as _ from "lodash";
import { PnPClientStorage } from "@pnp/common";

/*************************************************************************************/
// Hook to get user profile information
/*************************************************************************************/
export const useGetUserProperties = async (
  userEmail: string,
  context: WebPartContext
): Promise<{
  _managersList: IUserInfo[];
  _currentUserProfile: IUserInfo;
  _reportsList: IUserInfo[];
  getPresenceStatus: (
    managersList: IUserInfo[],
    reportsList: IUserInfo[],
    currentUserProfile: IUserInfo
  ) => Promise<any>;
}> => {

  if (!context) {
    throw new Error("WebPartContext is required");
  }

  if (!userEmail) {
    throw new Error("User email is required");
  }

  const graphClient = await context.msGraphClientFactory.getClient("3");
  const sp = spfi().using(spSPFx(context));
  const storage = new PnPClientStorage();

  const loginName = `i:0#.f|membership|${userEmail}`;

  let _managersList: IUserInfo[] = [];
  let _reportsList: IUserInfo[] = [];

  /* ================= HELPERS ================= */

  const getUserId = async (propsArr: any[]): Promise<string> => {
    const props: Record<string, string> = {};
    propsArr?.forEach(p => (props[p.Key] = p.Value));
    return props["msOnline-ObjectId"];
  };

  const getImageBase64 = async (
    pictureUrl: string,
    userId: string
  ): Promise<string> => {

    const cached = storage.local.get(userId);
    if (cached) return cached;

    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve("");
          return;
        }

        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/png");
        storage.local.put(userId, base64);
        resolve(base64);
      };

      img.onerror = () => resolve("");
      img.src = pictureUrl;
    });
  };

  const getUserPresence = async (
    userObjIds: string[]
  ): Promise<IUserPresence[]> => {

    if (!userObjIds.length) return [];

    const res = await graphClient
      .api("/communications/getPresencesByUserId")
      .version("beta")
      .post({ ids: userObjIds });

    return res?.value ?? [];
  };

  /* ================= PRESENCE UPDATE HELPERS ================= */

  const updateManagersPresence = async (
    presences: IUserPresence[]
  ): Promise<IUserInfo[]> => {

    presences.forEach(p => {
      const idx = _.findIndex(_managersList, m => m.id === p.id);
      if (idx >= 0) {
        _managersList[idx] = {
          ..._managersList[idx],
          presence: {
            activity: p.activity,
            availability: p.availability,
          },
        };
      }
    });

    return _managersList;
  };

  const updateDirectReportsPresence = async (
    presences: IUserPresence[]
  ): Promise<IUserInfo[]> => {

    presences.forEach(p => {
      const idx = _.findIndex(_reportsList, r => r.id === p.id);
      if (idx >= 0) {
        _reportsList[idx] = {
          ..._reportsList[idx],
          presence: {
            activity: p.activity,
            availability: p.availability,
          },
        };
      }
    });

    return _reportsList;
  };

  /* ================= MANAGERS ================= */

  const getManagers = async (extendedManagers: string[]) => {
    const managerIds: string[] = [];

    for (const manager of extendedManagers) {
      const profile: any = await sp.profiles.getPropertiesFor(manager);
      const objId = await getUserId(profile.UserProfileProperties);

      managerIds.push(objId);

      _managersList.push({
        id: objId,
        displayName: profile.DisplayName,
        email: profile.Email,
        title: profile.Title,
        userUrl: profile.UserUrl,
        pictureUrl: await getImageBase64(
          `/_layouts/15/userphoto.aspx?size=M&accountname=${profile.Email}`,
          objId
        ),
      });
    }

    await updateManagersPresence(await getUserPresence(managerIds));
  };

  /* ================= DIRECT REPORTS ================= */

  const getDirectReports = async (directReports: string[]) => {
    const reportIds: string[] = [];

    for (const report of directReports) {
      const profile: any = await sp.profiles.getPropertiesFor(report);
      const objId = await getUserId(profile.UserProfileProperties);

      reportIds.push(objId);

      _reportsList.push({
        id: objId,
        displayName: profile.DisplayName,
        email: profile.Email,
        title: profile.Title,
        userUrl: profile.UserUrl,
        pictureUrl: await getImageBase64(
          `/_layouts/15/userphoto.aspx?size=M&accountname=${profile.Email}`,
          objId
        ),
      });
    }

    await updateDirectReportsPresence(await getUserPresence(reportIds));
  };

  /* ================= REFRESH PRESENCE (FIXED HERE) ================= */

  const getPresenceStatus = async (
    managersList: IUserInfo[],
    reportsList: IUserInfo[],
    currentUserProfile: IUserInfo
  ) => {

    const managerIds: string[] = managersList
      .map(m => m.id)
      .filter((id): id is string => Boolean(id));

    const reportIds: string[] = reportsList
      .map(r => r.id)
      .filter((id): id is string => Boolean(id));

    await updateManagersPresence(await getUserPresence(managerIds));
    await updateDirectReportsPresence(await getUserPresence(reportIds));

    if (currentUserProfile.id) {
      const currentPresence = await getUserPresence([currentUserProfile.id]);
      if (currentPresence.length > 0) {
        currentUserProfile.presence = {
          activity: currentPresence[0].activity,
          availability: currentPresence[0].availability,
        };
      }
    }

    return { managersList, currentUserProfile, reportsList };
  };

  /* ================= MAIN ================= */

  const currentProfile: any = await sp.profiles.getPropertiesFor(loginName);
  const currentUserId = await getUserId(currentProfile.UserProfileProperties);

  const _currentUserProfile: IUserInfo = {
    id: currentUserId,
    displayName: currentProfile.DisplayName,
    email: currentProfile.Email,
    title: currentProfile.Title,
    userUrl: currentProfile.UserUrl,
    pictureUrl: await getImageBase64(
      `/_layouts/15/userphoto.aspx?size=M&accountname=${currentProfile.Email}`,
      currentUserId
    ),
  };

  const currentPresence = await getUserPresence([currentUserId]);
  if (currentPresence.length > 0) {
    _currentUserProfile.presence = {
      activity: currentPresence[0].activity,
      availability: currentPresence[0].availability,
    };
  }

  if (currentProfile.ExtendedManagers?.length) {
    await getManagers(currentProfile.ExtendedManagers);
  }

  if (currentProfile.DirectReports?.length) {
    await getDirectReports(currentProfile.DirectReports);
  }

  return {
    _managersList,
    _currentUserProfile,
    _reportsList,
    getPresenceStatus,
  };
};
