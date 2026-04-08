using System.Diagnostics;
using System.Text;

static string FindRepoWindowsPath()
{
    var current = new DirectoryInfo(AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));

    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "launcher-entry.sh")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new InvalidOperationException("Could not locate launcher-entry.sh. Make sure the launcher is inside the claude-code repository.");
}

static string ToWslPath(string windowsPath)
{
    if (windowsPath.StartsWith(@"\\"))
    {
        throw new InvalidOperationException("UNC paths are not supported by this launcher.");
    }

    var fullPath = Path.GetFullPath(windowsPath);
    if (fullPath.Length < 3 || fullPath[1] != ':' || !char.IsLetter(fullPath[0]))
    {
        throw new InvalidOperationException($"Unsupported Windows path: {fullPath}");
    }

    var driveLetter = char.ToLowerInvariant(fullPath[0]);
    var suffix = fullPath[2..].Replace('\\', '/');
    return $"/mnt/{driveLetter}{suffix}";
}

static ProcessStartInfo CreateWslProcessStartInfo(IEnumerable<string> arguments, bool redirectOutput = false)
{
    var psi = new ProcessStartInfo
    {
        FileName = "wsl.exe",
        UseShellExecute = false,
        RedirectStandardOutput = redirectOutput,
        RedirectStandardError = redirectOutput,
        StandardOutputEncoding = redirectOutput ? Encoding.Unicode : null,
        StandardErrorEncoding = redirectOutput ? Encoding.Unicode : null,
    };

    foreach (var argument in arguments)
    {
        psi.ArgumentList.Add(argument);
    }

    return psi;
}

static (int ExitCode, string StdOut, string StdErr) RunWslCapture(params string[] arguments)
{
    using var process = Process.Start(CreateWslProcessStartInfo(arguments, redirectOutput: true));
    if (process is null)
    {
        throw new InvalidOperationException("Failed to start wsl.exe.");
    }

    var stdout = process.StandardOutput.ReadToEnd();
    var stderr = process.StandardError.ReadToEnd();
    process.WaitForExit();

    return (process.ExitCode, stdout.Trim(), stderr.Trim());
}

static string NormalizeWslText(string text)
{
    if (string.IsNullOrWhiteSpace(text))
    {
        return string.Empty;
    }

    return text.Replace("\0", string.Empty).Replace("\r\r\n", Environment.NewLine).Trim();
}

static string HumanizeWslError(string text)
{
    var normalized = NormalizeWslText(text);
    if (string.IsNullOrWhiteSpace(normalized))
    {
        return string.Empty;
    }

    if (normalized.Contains("HCS_E_SERVICE_NOT_AVAILABLE", StringComparison.OrdinalIgnoreCase))
    {
        return "WSL is installed, but the WSL/HCS service is not currently available. Try restarting WSL with `wsl --shutdown`, or restart Windows and try again.";
    }

    return normalized;
}

static string[] GetAvailableDistros()
{
    var result = RunWslCapture("-l", "-q");
    if (result.ExitCode != 0)
    {
        var detail = HumanizeWslError(string.IsNullOrWhiteSpace(result.StdErr) ? result.StdOut : result.StdErr);
        throw new InvalidOperationException(string.IsNullOrWhiteSpace(detail) ? "Failed to query WSL distributions." : detail);
    }

    return NormalizeWslText(result.StdOut)
        .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

static string? GetDefaultDistro()
{
    var result = RunWslCapture("-l", "-v");
    if (result.ExitCode != 0)
    {
        return null;
    }

    foreach (var rawLine in NormalizeWslText(result.StdOut).Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        var line = rawLine.TrimStart();
        if (!line.StartsWith("*"))
        {
            continue;
        }

        var columns = line[1..].Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (columns.Length > 0)
        {
            return columns[0];
        }
    }

    return null;
}

static string SelectDistro()
{
    var available = GetAvailableDistros();
    if (available.Length == 0)
    {
        throw new InvalidOperationException("No WSL distributions are installed.");
    }

    var preferred = Environment.GetEnvironmentVariable("CLAUDE_CODE_WSL_DISTRO");
    if (!string.IsNullOrWhiteSpace(preferred))
    {
        var match = available.FirstOrDefault(name => string.Equals(name, preferred, StringComparison.OrdinalIgnoreCase));
        if (match is not null)
        {
            return match;
        }

        throw new InvalidOperationException($"WSL distro '{preferred}' was requested by CLAUDE_CODE_WSL_DISTRO but is not installed.");
    }

    var defaultDistro = GetDefaultDistro();
    if (!string.IsNullOrWhiteSpace(defaultDistro))
    {
        return defaultDistro;
    }

    var ubuntu2204 = available.FirstOrDefault(name => string.Equals(name, "Ubuntu-22.04", StringComparison.OrdinalIgnoreCase));
    return ubuntu2204 ?? available[0];
}

static void EnsureWslLaunchable(string distro)
{
    var result = RunWslCapture("-d", distro, "--", "bash", "-lc", "exit 0");
    if (result.ExitCode == 0)
    {
        return;
    }

    var detail = HumanizeWslError(string.IsNullOrWhiteSpace(result.StdErr) ? result.StdOut : result.StdErr);
    throw new InvalidOperationException(string.IsNullOrWhiteSpace(detail) ? $"Failed to start WSL distro '{distro}'." : detail);
}

static ProcessStartInfo BuildLauncherStartInfo(string distro, string repoWslPath, string mode)
{
    var scriptWslPath = ToWslPath(Path.Combine(FindRepoWindowsPath(), "launcher-entry.sh"));
    return CreateWslProcessStartInfo(new[]
    {
        "-d",
        distro,
        "--",
        "bash",
        scriptWslPath,
        repoWslPath,
        mode,
    });
}

static void PauseForUser()
{
    Console.WriteLine();
    Console.Write("Press Enter to close...");
    Console.ReadLine();
}

try
{
    var repoWindowsPath = FindRepoWindowsPath();
    var repoWslPath = ToWslPath(repoWindowsPath);
    var scriptWslPath = ToWslPath(Path.Combine(repoWindowsPath, "launcher-entry.sh"));
    var distro = SelectDistro();

    if (args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase))
    {
        Console.WriteLine($"Repo (Windows): {repoWindowsPath}");
        Console.WriteLine($"Repo (WSL): {repoWslPath}");
        Console.WriteLine($"WSL distro: {distro}");
        Console.WriteLine("Command:");
        Console.WriteLine($"wsl.exe -d {distro} -- bash {scriptWslPath} {repoWslPath} run");
        return;
    }

    if (args.Contains("--probe", StringComparer.OrdinalIgnoreCase))
    {
        var probe = RunWslCapture("-d", distro, "--", "bash", scriptWslPath, repoWslPath, "probe");
        var output = HumanizeWslError(string.Join(Environment.NewLine, new[] { probe.StdOut, probe.StdErr }.Where(text => !string.IsNullOrWhiteSpace(text))));
        if (!string.IsNullOrWhiteSpace(output))
        {
            Console.WriteLine(output);
        }

        Environment.ExitCode = probe.ExitCode;
        if (probe.ExitCode != 0)
        {
            PauseForUser();
        }
        return;
    }

    EnsureWslLaunchable(distro);

    using var process = Process.Start(BuildLauncherStartInfo(distro, repoWslPath, "run"));
    if (process is null)
    {
        throw new InvalidOperationException("Failed to start wsl.exe.");
    }

    process.WaitForExit();
    Environment.ExitCode = process.ExitCode;

    if (process.ExitCode != 0)
    {
        Console.Error.WriteLine();
        Console.Error.WriteLine($"Claude Code launcher exited with code {process.ExitCode}.");
        Console.Error.WriteLine("Check the message above for the WSL or Bun error.");
        PauseForUser();
    }
}
catch (Exception ex)
{
    Console.Error.WriteLine("Claude Code launcher failed.");
    Console.Error.WriteLine(ex.Message);
    PauseForUser();
    Environment.ExitCode = 1;
}
