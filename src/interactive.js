import * as p from '@clack/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';

// Custom gradient for Smippo branding
const smippoGradient = gradient(['#60a5fa', '#a78bfa', '#f472b6']);

/**
 * Display the Smippo banner
 */
export function showBanner() {
	console.log('');
	console.log(
		smippoGradient(
			figlet.textSync('Smippo', {
				font: 'Small',
				horizontalLayout: 'default',
			})
		)
	);
	console.log(chalk.dim('  Modern Website Copier • Powered by Playwright'));
	console.log('');
}

/**
 * Display help information with visual formatting
 */
export function showHelp() {
	showBanner();

	console.log(chalk.bold.white('USAGE'));
	console.log('');
	console.log(`  ${chalk.cyan('smippo')} ${chalk.dim('[url]')} ${chalk.yellow('[options]')}`);
	console.log(`  ${chalk.cyan('smippo')} ${chalk.green('<command>')} ${chalk.yellow('[options]')}`);
	console.log('');

	console.log(chalk.bold.white('COMMANDS'));
	console.log('');
	console.log(`  ${chalk.green('capture')} ${chalk.dim('<url>')}         Take a screenshot of a URL`);
	console.log(`  ${chalk.green('serve')} ${chalk.dim('[directory]')}    Serve captured site locally`);
	console.log(`  ${chalk.green('continue')}                Resume interrupted capture`);
	console.log(`  ${chalk.green('update')}                  Update existing mirror`);
	console.log(`  ${chalk.green('help')}                    Show this help message`);
	console.log('');

	console.log(chalk.bold.white('CAPTURE OPTIONS'));
	console.log('');
	console.log(`  ${chalk.yellow('-o, --output')} ${chalk.dim('<dir>')}       Output directory ${chalk.dim('(default: ./site)')}`);
	console.log(`  ${chalk.yellow('-d, --depth')} ${chalk.dim('<n>')}          Recursion depth ${chalk.dim('(0 = single page)')}`);
	console.log(`  ${chalk.yellow('-s, --scope')} ${chalk.dim('<type>')}       Link scope: subdomain|domain|tld|all`);
	console.log(`  ${chalk.yellow('--external-assets')}        Include assets from external domains`);
	console.log(`  ${chalk.yellow('--static')}                 Strip JS for static offline viewing`);
	console.log('');

	console.log(chalk.bold.white('FILTERING'));
	console.log('');
	console.log(`  ${chalk.yellow('-I, --include')} ${chalk.dim('<glob>')}     Include URLs matching pattern`);
	console.log(`  ${chalk.yellow('-E, --exclude')} ${chalk.dim('<glob>')}     Exclude URLs matching pattern`);
	console.log(`  ${chalk.yellow('--max-size')} ${chalk.dim('<size>')}        Maximum file size ${chalk.dim('(e.g., 10MB)')}`);
	console.log(`  ${chalk.yellow('--mime-include')} ${chalk.dim('<type>')}    Include MIME types`);
	console.log(`  ${chalk.yellow('--mime-exclude')} ${chalk.dim('<type>')}    Exclude MIME types`);
	console.log('');

	console.log(chalk.bold.white('BROWSER'));
	console.log('');
	console.log(`  ${chalk.yellow('--wait')} ${chalk.dim('<strategy>')}        Wait: networkidle|load|domcontentloaded`);
	console.log(`  ${chalk.yellow('--wait-time')} ${chalk.dim('<ms>')}         Extra wait time after load`);
	console.log(`  ${chalk.yellow('--timeout')} ${chalk.dim('<ms>')}           Page load timeout`);
	console.log(`  ${chalk.yellow('--viewport')} ${chalk.dim('<WxH>')}         Viewport size ${chalk.dim('(default: 1920x1080)')}`);
	console.log(`  ${chalk.yellow('--device')} ${chalk.dim('<name>')}          Emulate device`);
	console.log('');

	console.log(chalk.bold.white('OUTPUT'));
	console.log('');
	console.log(`  ${chalk.yellow('--screenshot')}             Take screenshot of each page`);
	console.log(`  ${chalk.yellow('--pdf')}                    Save PDF of each page`);
	console.log(`  ${chalk.yellow('--har')}                    Generate HAR file ${chalk.dim('(default: true)')}`);
	console.log(`  ${chalk.yellow('--no-har')}                 Disable HAR generation`);
	console.log('');

	console.log(chalk.bold.white('PERFORMANCE'));
	console.log('');
	console.log(`  ${chalk.yellow('-w, --workers')} ${chalk.dim('<n>')}        Parallel workers ${chalk.dim('(default: 8)')}`);
	console.log(`  ${chalk.yellow('--max-pages')} ${chalk.dim('<n>')}          Maximum pages to capture`);
	console.log(`  ${chalk.yellow('--rate-limit')} ${chalk.dim('<ms>')}        Delay between requests`);
	console.log('');

	console.log(chalk.bold.white('OTHER'));
	console.log('');
	console.log(`  ${chalk.yellow('-v, --verbose')}            Verbose output`);
	console.log(`  ${chalk.yellow('-q, --quiet')}              Minimal output`);
	console.log(`  ${chalk.yellow('--debug')}                  Debug mode with visible browser`);
	console.log(`  ${chalk.yellow('--no-interaction')}         Non-interactive mode (for CI)`);
	console.log('');

	console.log(chalk.bold.white('EXAMPLES'));
	console.log('');
	console.log(chalk.dim('  # Mirror a single page'));
	console.log(`  ${chalk.cyan('smippo')} https://example.com`);
	console.log('');
	console.log(chalk.dim('  # Mirror a site 3 levels deep'));
	console.log(`  ${chalk.cyan('smippo')} https://example.com ${chalk.yellow('-d 3')}`);
	console.log('');
	console.log(chalk.dim('  # Mirror as static HTML (strips JS for offline viewing)'));
	console.log(`  ${chalk.cyan('smippo')} https://example.com ${chalk.yellow('--static --external-assets')}`);
	console.log('');
	console.log(chalk.dim('  # Take a screenshot'));
	console.log(`  ${chalk.cyan('smippo capture')} https://example.com`);
	console.log('');
	console.log(chalk.dim('  # Full-page screenshot'));
	console.log(`  ${chalk.cyan('smippo capture')} https://example.com ${chalk.yellow('--full-page')}`);
	console.log('');
	console.log(chalk.dim('  # Screenshot with device emulation'));
	console.log(`  ${chalk.cyan('smippo capture')} https://example.com ${chalk.yellow('--device "iPhone 13"')}`);
	console.log('');
	console.log(chalk.dim('  # Serve captured site'));
	console.log(`  ${chalk.cyan('smippo serve')} ./site ${chalk.yellow('--open')}`);
	console.log('');
	console.log(chalk.dim('  # Interactive guided mode'));
	console.log(`  ${chalk.cyan('smippo')}`);
	console.log('');
}

/**
 * Run the interactive guided capture wizard
 */
export async function runInteractiveCapture() {
	showBanner();

	p.intro(chalk.bgCyan.black(' Capture Wizard '));

	const options = await p.group(
		{
			url: () =>
				p.text({
					message: 'What URL would you like to capture?',
					placeholder: 'https://example.com',
					validate: value => {
						if (!value) return 'URL is required';
						try {
							new URL(value);
						} catch {
							return 'Please enter a valid URL';
						}
					},
				}),

			depth: () =>
				p.select({
					message: 'How deep should we crawl?',
					options: [
						{ value: '0', label: 'Single page only', hint: 'fastest' },
						{ value: '1', label: '1 level deep', hint: 'links from main page' },
						{ value: '2', label: '2 levels deep' },
						{ value: '3', label: '3 levels deep', hint: 'recommended for small sites' },
						{ value: 'custom', label: 'Custom depth...' },
					],
				}),

			customDepth: ({ results }) => {
				if (results.depth !== 'custom') return;
				return p.text({
					message: 'Enter custom depth:',
					placeholder: '5',
					validate: v => (isNaN(parseInt(v)) ? 'Please enter a number' : undefined),
				});
			},

			scope: () =>
				p.select({
					message: 'Link following scope:',
					options: [
						{ value: 'domain', label: 'Same domain', hint: 'www.example.com + example.com' },
						{ value: 'subdomain', label: 'Same subdomain only', hint: 'strict' },
						{ value: 'all', label: 'All links', hint: 'careful - can be slow!' },
					],
				}),

			externalAssets: () =>
				p.confirm({
					message: 'Include assets from external domains (CDNs, fonts)?',
					initialValue: true,
				}),

			static: () =>
				p.confirm({
					message: 'Strip JavaScript for static offline viewing?',
					initialValue: false,
				}),

			advanced: () =>
				p.confirm({
					message: 'Configure advanced options?',
					initialValue: false,
				}),

			output: ({ results }) => {
				if (!results.advanced) return;
				return p.text({
					message: 'Output directory:',
					placeholder: './site',
					initialValue: './site',
				});
			},

			screenshot: ({ results }) => {
				if (!results.advanced) return;
				return p.confirm({
					message: 'Take screenshots of each page?',
					initialValue: false,
				});
			},

			workers: ({ results }) => {
				if (!results.advanced) return;
				return p.select({
					message: 'Parallel workers:',
					options: [
						{ value: '1', label: '1 worker', hint: 'slowest, safest for rate-limited sites' },
						{ value: '4', label: '4 workers', hint: 'moderate' },
						{ value: '8', label: '8 workers', hint: 'default' },
						{ value: '16', label: '16 workers', hint: 'fast, use with caution' },
					],
				});
			},
		},
		{
			onCancel: () => {
				p.cancel('Capture cancelled.');
				process.exit(0);
			},
		}
	);

	// Build final options
	const finalOptions = {
		url: options.url,
		output: options.output || './site',
		depth: options.customDepth || options.depth,
		scope: options.scope,
		externalAssets: options.externalAssets,
		static: options.static,
		screenshot: options.screenshot,
		workers: options.workers || '8',
	};

	// Show summary
	console.log('');
	p.note(
		[
			`URL:        ${chalk.cyan(finalOptions.url)}`,
			`Depth:      ${finalOptions.depth}`,
			`Scope:      ${finalOptions.scope}`,
			`External:   ${finalOptions.externalAssets ? 'Yes' : 'No'}`,
			`Static:     ${finalOptions.static ? 'Yes' : 'No'}`,
			`Output:     ${finalOptions.output}`,
		].join('\n'),
		'Capture Settings'
	);

	const confirmed = await p.confirm({
		message: 'Start capture?',
		initialValue: true,
	});

	if (!confirmed) {
		p.cancel('Capture cancelled.');
		process.exit(0);
	}

	p.outro(chalk.dim('Starting capture...'));
	console.log('');

	return finalOptions;
}

/**
 * Check if we should run in interactive mode
 */
export function shouldRunInteractive(args) {
	// Check for explicit flags
	if (args.includes('--no-interaction') || args.includes('-y')) {
		return false;
	}

	// Check if stdin is a TTY (interactive terminal)
	if (!process.stdin.isTTY) {
		return false;
	}

	// Check if we have a URL or command
	const hasUrlOrCommand = args.some(arg => {
		if (arg.startsWith('-')) return false;
		if (arg.startsWith('http://') || arg.startsWith('https://')) return true;
		if (['capture', 'serve', 'continue', 'update', 'help'].includes(arg)) return true;
		return false;
	});

	return !hasUrlOrCommand;
}

