import { getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  await processAutoStart(id)
  await processClassicExpiry(id)
  await processLapTransitions(id)

  return buildCompetitionResponse(id)
})
