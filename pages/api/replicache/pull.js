// Utilities
import prisma from 'utils/prisma'
import utilApiEntriesTodoGet from 'utils/api/entries/todoGet'
import utilApiLastMutationIdGet from 'utils/api/lastMutationIdGet'
import utilAuth from 'utils/auth'

const PagesApiReplicachePull = async (req, res) => {
	console.log('\nPull: ***', req.body, '***\n')

	const { data: user, error: userErr } = await utilAuth(req, res)
	if (!user || userErr) return res.status(401)

	// Provided by Replicache
	const { clientID, cookie } = req.body

	// Provided by client
	const { spaceId } = req.query

	if (!clientID || !spaceId || cookie === undefined) return res.status(403)

	await prisma.$transaction(async tx => {
		// #1. Get last mutation Id for the current client
		let { data: lastMutationId } = await utilApiLastMutationIdGet({ clientID, tx })

		// #2. Get all transactions done after the last client request for the current space
		const { data: apiEntriesTodoGet } = await utilApiEntriesTodoGet({
			cookie,
			spaceId,
			tx,
			userId: user.id
		})

		// #3. Get the highest authoritative version number
		const replicacheVersion = apiEntriesTodoGet?.length
			? Math.max(...apiEntriesTodoGet?.map(x => x.lastModifiedVersion))
			: null

		// #4. Put together a patch with instructions for the client
		const patch = []

		if (replicacheVersion === null) patch.push({ op: 'clear' })

		if (apiEntriesTodoGet?.length)
			patch.push(
				...apiEntriesTodoGet.map(todo => ({
					op: !todo.isDeleted ? 'put' : 'del',
					key: `todo/${todo.todoId}`,
					value: { ...todo }
				}))
			)

		// #5. Return object to client
		res.json({ lastMutationID: lastMutationId, cookie: replicacheVersion, patch })
	})
}

export default PagesApiReplicachePull
