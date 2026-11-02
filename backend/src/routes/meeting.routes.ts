import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', MeetingController.createMeeting);
router.get('/my-meetings', MeetingController.getMyMeetings);
router.post('/join', MeetingController.joinMeeting);
router.get('/:meetingId', MeetingController.getMeeting);
router.post('/:meetingId/join', MeetingController.joinMeeting);
router.patch('/:meetingId/end', MeetingController.endMeeting);

export default router;

