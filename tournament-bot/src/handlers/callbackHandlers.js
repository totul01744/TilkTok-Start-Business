// Handle inline button callbacks
async function callbackHandler(ctx) {
  const data = ctx.callbackQuery.data;
  
  try {
    await ctx.answerCbQuery();
    
    if (data.startsWith('join_')) {
      const tournamentId = data.replace('join_', '');
      ctx.message = { ...ctx.callbackQuery.message, text: `/join ${tournamentId}`, from: ctx.from };
      return require('./tournamentHandlers').joinTournament(ctx);
    }

    if (data.startsWith('leaderboard_')) {
      const tournamentId = data.replace('leaderboard_', '');
      ctx.message = { ...ctx.callbackQuery.message, text: `/leaderboard ${tournamentId}`, from: ctx.from };
      return require('./tournamentHandlers').leaderboard(ctx);
    }
    
  } catch (err) {
    console.error('Callback error:', err);
    await ctx.answerCbQuery('Something went wrong!');
  }
}

module.exports = callbackHandler;
