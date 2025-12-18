import { spfi, SPFx as spSPFx } from "@pnp/sp";
import "@pnp/sp/profiles";
import { IUserInfo } from "../Entities/IUserInfo";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { MSGraphClientV3 } from "@microsoft/sp-http";
import { IUserPresence } from "../Entities/IUserPresence";
/*************************************************************************************/
// Hook to get user profile information
//*************************************************************************************/

export const useGetUserProperties = async (
  userEmail: string,
  context: WebPartContext
): Promise<any> => {
  /*************************************************************************************/
  //  vars and const
  //*************************************************************************************/
  const _MSGraphClient: MSGraphClientV3 = await context.msGraphClientFactory.getClient("3");
  const loginName: string = `i:0#.f|membership|${userEmail}`;

  // fallback storage wrapper using browser localStorage
  const storage = {
    local: {
      get: (k: string) => {
        try {
          return localStorage.getItem(k) || undefined;
        } catch (e) {
          return undefined;
        }
      },
      put: (k: string, v: string) => {
        try {
          localStorage.setItem(k, v);
        } catch (e) {
          // ignore
        }
      },
    },
  } as any;
  let _managersList: IUserInfo[] = [];
  let _reportsList: IUserInfo[] = [];

  const sp = spfi().using(spSPFx(context));
 /*  spfi.setup({
    spfxContext: context
  }); */
  /*************************************************************************************/
  // Functions
  //*************************************************************************************//
  // function Get UserId from UserProfileProperties
  //*************************************************************************************//
  const getUserId = async (userProfileProperties: any[]): Promise<string> => {
    // Get User Properties
    let props: Record<string, any> = {};
    userProfileProperties.forEach((prop: any) => {
      props[prop.Key] = prop.Value;
    });
    // Get UserID (return empty string if not found)
    return props["msOnline-ObjectId"] || "";
  };

  //*************************************************************************************//
  // functions  convert image to Base64
  //*************************************************************************************//
  const getImageBase64 = (pictureUrl: string, userId?: string): Promise<string> => {
    return new Promise((resolve) => {
      const key = userId || pictureUrl;
      const value = storage.local.get(key);
      if (value) {
        resolve(value);
        return;
      }
      let image = new Image();
      image.addEventListener("load", () => {
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = image.width; // eslint-disable-line
        tempCanvas.height = image.height;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(image, 0, 0);
        }
        let base64Str = "";
        try {
          base64Str = tempCanvas.toDataURL("image/png");
        } catch (e) {
          resolve("");
          return;
        }
        storage.local.put(key, base64Str);
        resolve(base64Str);
      });
      image.src = pictureUrl;
    });
  };
  //*************************************************************************************//
  //  function  Get Users Presence
  //*************************************************************************************//
  const getUserPresence = async (
    userObjIds: string[]
  ): Promise<IUserPresence[]> => {
    // Get presences for Users Ids
    const _presence: any = await _MSGraphClient
      .api(`/communications/getPresencesByUserId`)
      .version("beta")
      .post({ ids: userObjIds });

    return _presence.value;
  };

  //*************************************************************************************//
  // Get User Managers
  //*************************************************************************************//
  const getManagers = async (extendedManagers:string[] ) => {
    let _managersObjIds: string[] = [];
    // Get Managers
    for (const _manager of extendedManagers) {
      // get Profile for Manager
      const _profile: any = await sp.profiles
        .getPropertiesFor(_manager);

      // Get Object Id from userProperties
      const _managerObjId: string = await getUserId(
        _profile.UserProfileProperties
      );
      _managersObjIds.push(_managerObjId);
      // Add manager to list
      _managersList.push({
        displayName: _profile.DisplayName as string,
        email: _profile.Email as string,
        title: _profile.Title as string,
        pictureUrl: await getImageBase64(
          `/_layouts/15/userphoto.aspx?size=M&accountname=${_profile.Email ?? ""}`,
          _managerObjId ?? ""
        ),
        id: _managerObjId,
        // presence: await getUserPresence(_profile.UserProfileProperties),
        userUrl: _profile.UserUrl,
      });
    }
    //*************************************************************************************//
    // Get presence for all managers
    //*************************************************************************************//
    const _managersPresences: IUserPresence[] = await getUserPresence(
      _managersObjIds
    );
    await updateManagersPresence(_managersPresences);
  };
//************************************************************************************//
// function Update List os Managers with presence status
//************************************************************************************//
  const updateManagersPresence = async (_managersPresences: IUserPresence[]):Promise<IUserInfo[]> => {
    if (_managersPresences.length > 0) {
      for (const _presence of _managersPresences) {
        let i = -1;
        for (let idx = 0; idx < _managersList.length; idx++) {
          if (_managersList[idx].id == _presence.id) {
            i = idx;
            break;
          }
        }
        if (i >= 0) {
          _managersList[i] = {
            ..._managersList[i],
            presence: {
              activity: _presence.activity,
              availability: _presence.availability,
            },
          };
        }
      }
    }
    return _managersList;
  };


  //************************************************************************************//
  // Get Direct Reports
  //*************************************************************************************//

  const getDirectReports = async (directReports:string[] ) => {
    let _userReportObjIds: string[] = [];
    for (const _userReport of directReports) {
      const _profile: any = await sp.profiles
        .getPropertiesFor(_userReport);

      const _userReportObjId: string = await getUserId(
        _profile.UserProfileProperties
      );
      _userReportObjIds.push(_userReportObjId);
      // Get Presence to the user
      _reportsList.push({
        displayName: _profile.DisplayName as string,
        email: _profile.Email as string,
        title: _profile.Title as string,
        pictureUrl: await getImageBase64(
          `/_layouts/15/userphoto.aspx?size=M&accountname=${_profile.Email ?? ""}`,
          _userReportObjId ?? ""
        ),
        id: _userReportObjId,
        userUrl: _profile.UserUrl,
      });
    }
    //*************************************************************************************//
    // Get presence for all direct Reports and update list
    //*************************************************************************************//
    const _directReportsPresences: IUserPresence[] = await getUserPresence(
      _userReportObjIds
    );
    // Update Array of direct reports with presence
    await updateDirectReportsPresence(_directReportsPresences);
  };

 //*************************************************************************************//
    // Funcion  Update List os Direct Reports with presence status
    //*************************************************************************************//
const updateDirectReportsPresence = async (directReportsPresences: IUserPresence[]):Promise<IUserInfo[]> => {
    // Update Array of direct reports with presence
    if (directReportsPresences.length > 0) {
      for (const _presence of directReportsPresences) {
        let i = -1;
        for (let idx = 0; idx < _reportsList.length; idx++) {
          if (_reportsList[idx].id == _presence.id) {
            i = idx;
            break;
          }
        }
        if (i >= 0) {
          _reportsList[i] = {
            ..._reportsList[i],
            presence: {
              activity: _presence.activity,
              availability: _presence.availability,
            },
          };
        }
      }
    }
    return _reportsList;
};


//*************************************************************************************//
  // Get news status of managers and direct Reports
  //*************************************************************************************//

  const getPresenceStatus =  async ( managersList: IUserInfo[],reportsList:IUserInfo[], currentUserProfile: any):Promise<any> => {
    const _managersObjIds: string[] = managersList
      .map((m) => m.id)
      .filter((id): id is string => !!id);
    const _userReportObjIds: string[] = reportsList
      .map((r) => r.id)
      .filter((id): id is string => !!id);

    // get new status of Managers and update list os managers
    if (_managersObjIds.length > 0) {
      const _managersPresences: IUserPresence[] = await getUserPresence(
        _managersObjIds
      );
      managersList = await updateManagersPresence(_managersPresences);
    }

    // get new status of Direct Reports and update list of direct Reports
    if (_userReportObjIds.length > 0) {
      const _directReportsPresences: IUserPresence[] = await getUserPresence(
        _userReportObjIds
      );
      reportsList = await updateDirectReportsPresence(_directReportsPresences);
    }

    // Get update status for current user

    if (currentUserProfile?.id) {
      const _currentUserPresenceUpd: IUserPresence[] = await getUserPresence([
        currentUserProfile.id,
      ]);
      if (_currentUserPresenceUpd && _currentUserPresenceUpd[0]) {
        currentUserProfile.presence = {
          activity: _currentUserPresenceUpd[0].activity,
          availability: _currentUserPresenceUpd[0].availability,
        };
      }
    }

    return { managersList, currentUserProfile, reportsList };

  };
  //*************************************************************************************//
  // End Functions
  //*************************************************************************************//

  //*************************************************************************************//
  //  MAIN - Get Current User Profile
  //*************************************************************************************//
  const _currentUserProfile: any = await sp.profiles
    .getPropertiesFor(loginName);
  console.log(_currentUserProfile);
  // get Managers and Direct Reports
  const _extendedManagers: string[] = _currentUserProfile.ExtendedManagers;
  const _directReports: string[] = _currentUserProfile.DirectReports;
  // Get userObjId
  const _currentUserObjId: string = await getUserId( _currentUserProfile.UserProfileProperties);
  _currentUserProfile.id = _currentUserObjId;
  // Get Current user Picture and User Presence
  _currentUserProfile.PictureUrl = await getImageBase64(
    `/_layouts/15/userphoto.aspx?size=M&accountname=${_currentUserProfile.Email ?? ""}`,
    _currentUserObjId ?? "");
  // get Current User Presence
  const _currentUserPresence: IUserPresence[] = await getUserPresence([_currentUserObjId]);
  _currentUserProfile.presence = { activity: _currentUserPresence[0].activity, availability: _currentUserPresence[0].availability};
  // Get Manager if exists
  if (_extendedManagers.length > 0) await getManagers(_extendedManagers);
  // Get Direct Reports if exists
  if (_directReports.length > 0) await getDirectReports(_directReports);

  //*************************************************************************************//
  // Return objects
  //  _managersList , _currentUserProfile , DirectReports
  //*************************************************************************************//
  return { _managersList, _currentUserProfile, _reportsList, getPresenceStatus };
};
