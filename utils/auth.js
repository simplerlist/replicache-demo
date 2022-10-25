// Packages
import { withAuth, users } from '@clerk/nextjs/api'
// Utilities
import prisma from 'utils/prisma'

const UtilsAuth = withAuth(async (req, _) => {
	const { sessionId, userId } = req.auth

	if (!sessionId || !userId) return { error: 'not_signed_in' }

	const clerkUser = await users.getUser(userId)

	if (!clerkUser) return { error: 'user_not_found' }

	return { data: clerkUser }
})

export default UtilsAuth
