namespace SlamGoal.Data
{
    /// <summary>
    /// All footballer ability identifiers. Active abilities (BananaKick,
    /// SplitShot) are triggered by the player tapping the ability button
    /// mid-flight; passive abilities (PowerShot, Header, Goalie) bake
    /// into the launch / body stats and require no input.
    /// </summary>
    public enum AbilityId
    {
        PowerShot,
        BananaKick,
        SplitShot,
        Header,
        Goalie,
    }

    public static class AbilityIdExtensions
    {
        public static bool IsActive(this AbilityId id)
        {
            return id == AbilityId.BananaKick || id == AbilityId.SplitShot;
        }
    }
}
