import { createEventinCalDAVAccount, getCaldavAccountDetailsfromId } from '@/helpers/api/cal/caldav';
import { checkifUserHasAccesstoRequestedCalendar, getCaldavAccountfromUserID, getCaldavAccountIDFromCalendarID, getCalendarfromCalendarID } from '@/helpers/api/cal/calendars';
import { getAllLablesFromDB } from '@/helpers/api/cal/labels';
import { deleteCalendarObjectsFromDB, getObjectFromDB, insertObjectIntoDB, updateObjectinDB } from '@/helpers/api/cal/object';
import { middleWareForAuthorisation, getUseridFromUserhash , getUserHashSSIDfromAuthorisation} from '@/helpers/api/user';
import { getRandomString } from '@/helpers/crypto';
import { AES } from 'crypto-js';
import { createDAVClient, deleteCalendarObject } from 'tsdav';
import CryptoJS from 'crypto-js';
export default async function handler(req, res) {
    if (req.method === 'POST') {
        if(req.headers.authorization!=null && await middleWareForAuthorisation(req.headers.authorization))
        {
            if(req.body.etag!=null  && req.body.etag.trim()!="" && req.body.calendar_id!=null && req.body.calendar_id.toString().trim()!=""&&req.body.url!=null  && req.body.url.trim()!="")
            {
                var userHash= await getUserHashSSIDfromAuthorisation(req.headers.authorization)
                var userid = await getUseridFromUserhash(userHash[0])
                var currentCaldavAccountID=await getCaldavAccountIDFromCalendarID(req.body.calendar_id)
                var currentCalendar= await checkifUserHasAccesstoRequestedCalendar(userid, currentCaldavAccountID, req.body.calendar_id)
                if(currentCalendar!=null)
                {
                    var caldav_account= await getCaldavAccountDetailsfromId(currentCaldavAccountID)
                    // Delete event from CalDAV first.
                   var client = await createDAVClient({
                        serverUrl: caldav_account[0].url,
                        credentials: {
                            username: caldav_account[0].username,
                            password: AES.decrypt(caldav_account[0].password,process.env.AES_PASSWORD).toString(CryptoJS.enc.Utf8)
                        },
                        authMethod: 'Basic',
                        defaultAccountType: 'caldav',
                    })
                    const response_caldav = await client.deleteCalendarObject({
                        calendarObject: {
                          url: req.body.url,
                          etag: req.body.etag,
                        },
                      });            
                    // Now we delete object from DB (which means, just set it as DELETED)
                    const response = await deleteCalendarObjectsFromDB(req.body.url, req.body.calendar_id)

                    res.status(200).json({ success: true, data: { message: "DELETE_OK", detail: response_caldav} })

                }else{
                    res.status(401).json({ success: false, data: { message: 'CALENDAR_NOT_ACCESSIBLE'} })

                }
    
            }else
            {
                res.status(422).json({ success: false, data: {message: 'INVALID_INPUT'} })

            }

        }else
        {
            res.status(401).json({ success: false, data: { message: 'PLEASE_LOGIN'} })

        }
    }else {
        res.status(403).json({ success: 'false' ,data: {message: 'INVALID_METHOD'}})
    }
}