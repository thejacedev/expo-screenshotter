import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { View } from '../types';

/**
 * Detects routes in an Expo Router project by scanning the app directory
 * @param appDir Path to the app directory (default: './app')
 * @returns Array of detected routes as View objects
 */
export async function detectExpoRoutes(appDir: string = './app'): Promise<View[]> {
  console.log(chalk.blue('Scanning for routes in', appDir));
  
  if (!await fs.pathExists(appDir)) {
    console.log(chalk.yellow(`App directory not found: ${appDir}`));
    return [];
  }
  
  const routes: View[] = [];
  
  routes.push({
    name: 'Home',
    path: '/'
  });
  
  const rootLayoutPath = path.join(appDir, '_layout.tsx');
  const altRootLayoutPath = path.join(appDir, '_layout.js');
  const altRootLayoutPath2 = path.join(appDir, '_layout.jsx');
  
  let rootLayoutContent = '';
  
  if (await fs.pathExists(rootLayoutPath)) {
    rootLayoutContent = await fs.readFile(rootLayoutPath, 'utf-8');
  } else if (await fs.pathExists(altRootLayoutPath)) {
    rootLayoutContent = await fs.readFile(altRootLayoutPath, 'utf-8');
  } else if (await fs.pathExists(altRootLayoutPath2)) {
    rootLayoutContent = await fs.readFile(altRootLayoutPath2, 'utf-8');
  }
  
  if (rootLayoutContent) {
    const stackScreenRegex = /<Stack\.Screen[^>]*name=["']([^"']+)["'][^>]*/g;
    let match;
    
    while ((match = stackScreenRegex.exec(rootLayoutContent)) !== null) {
      const screenName = match[1];
      
      if (screenName && !screenName.startsWith('+')) {
        if (screenName.startsWith('(') && screenName.endsWith(')')) {
          console.log(chalk.blue(`Found tab group: ${screenName}`));
        } else {
          routes.push({
            name: screenName.charAt(0).toUpperCase() + screenName.slice(1),
            path: `/${screenName}`
          });
        }
      }
    }
  }
  
  await scanDirectory(appDir, '', routes);
  
  const processedRoutes = processRoutes(routes);
  
  console.log(chalk.green(`Found ${processedRoutes.length} routes`));
  return processedRoutes;
}

async function scanDirectory(
  currentDir: string, 
  routePath: string, 
  routes: View[]
): Promise<void> {
  const items = await fs.readdir(currentDir, { withFileTypes: true });
  
  const dirName = path.basename(currentDir);
  const isRouteGroup = dirName.startsWith('(') && dirName.endsWith(')');
  const isTabsGroup = dirName === '(tabs)';
  
  const hasLayout = items.some(item => 
    !item.isDirectory() && 
    (item.name === '_layout.tsx' || item.name === '_layout.js' || item.name === '_layout.jsx')
  );
  
  if (hasLayout) {
    const layoutPath = path.join(currentDir, '_layout.tsx');
    const altLayoutPath = path.join(currentDir, '_layout.js');
    const altLayoutPath2 = path.join(currentDir, '_layout.jsx');
    
    let layoutContent = '';
    
    if (await fs.pathExists(layoutPath)) {
      layoutContent = await fs.readFile(layoutPath, 'utf-8');
    } else if (await fs.pathExists(altLayoutPath)) {
      layoutContent = await fs.readFile(altLayoutPath, 'utf-8');
    } else if (await fs.pathExists(altLayoutPath2)) {
      layoutContent = await fs.readFile(altLayoutPath2, 'utf-8');
    }
    
    if (layoutContent) {
      if (isTabsGroup || layoutContent.includes('from \'expo-router/tabs\'') || layoutContent.includes('from "expo-router/tabs"')) {
        const tabScreenRegex = /<Tabs\.Screen[^>]*name=["']([^"']+)["'][^>]*options={[^}]*title:\s*["']([^"']+)["']/g;
        let match;
        
        while ((match = tabScreenRegex.exec(layoutContent)) !== null) {
          const screenName = match[1];
          const screenTitle = match[2];
          
          if (screenName) {
            routes.push({
              name: `Tab ${screenTitle || screenName}`,
              path: `/${screenName === 'index' ? '' : screenName}`
            });
          }
        }
      } else if (layoutContent.includes('<Stack') || layoutContent.includes('from \'expo-router/stack\'') || layoutContent.includes('from "expo-router/stack"')) {
        const stackScreenRegex = /<Stack\.Screen[^>]*name=["']([^"']+)["'][^>]*/g;
        let match;
        
        while ((match = stackScreenRegex.exec(layoutContent)) !== null) {
          const screenName = match[1];
          
          if (screenName && !screenName.startsWith('+') && !(screenName.startsWith('(') && screenName.endsWith(')'))) {
            const fullPath = routePath ? `${routePath}/${screenName}` : `/${screenName}`;
            routes.push({
              name: screenName.charAt(0).toUpperCase() + screenName.slice(1),
              path: fullPath
            });
          }
        }
      }
    }
  }
  
  for (const item of items.filter(item => !item.isDirectory())) {
    if (item.name.includes('_layout') || 
        item.name.startsWith('+') ||
        (!item.name.endsWith('.js') && 
         !item.name.endsWith('.jsx') && 
         !item.name.endsWith('.ts') && 
         !item.name.endsWith('.tsx'))) {
      continue;
    }
    
    const routeName = item.name.replace(/\.(js|jsx|ts|tsx)$/, '');
    
    if (routeName.startsWith('_') || routeName.startsWith('.')) {
      continue;
    }
    
    if ((isRouteGroup || isTabsGroup) && routeName === 'index') {
      continue;
    }
    
    let fullRoutePath = routePath;
    
    if (routeName !== 'index') {
      fullRoutePath = path.join(routePath, routeName).replace(/\\/g, '/');
    }
    
    if (isRouteGroup) {
    } else {
      if (!routeName.startsWith('[') && !routeName.endsWith(']')) {
        routes.push({
          name: routeName === 'index' 
            ? path.basename(currentDir) || 'Home'
            : routeName,
          path: fullRoutePath || '/'
        });
      }
    }
  }
  
  for (const item of items.filter(item => item.isDirectory())) {
    const dirName = item.name;
    
    if (dirName.startsWith('.') || dirName === 'node_modules') {
      continue;
    }
    
    const dirPath = path.join(currentDir, dirName);
    
    if (dirName.startsWith('(') && dirName.endsWith(')')) {
      await scanDirectory(dirPath, routePath, routes);
    } else {
      const newRoutePath = path.join(routePath, dirName).replace(/\\/g, '/');
      
      if (dirName.startsWith('[') && dirName.endsWith(']')) {
        const paramName = dirName.slice(1, -1);
        routes.push({
          name: `${path.basename(currentDir) || 'Route'}/${paramName}`,
          path: `${routePath}/${dirName.replace(/\[([^\]]+)\]/, '123')}`.replace(/\\/g, '/')
        });
      }
      
      await scanDirectory(dirPath, newRoutePath, routes);
    }
  }
}

function processRoutes(routes: View[]): View[] {
  const uniqueRoutes = routes.filter((route, index, self) => 
    index === self.findIndex((r) => r.path === route.path)
  );
  
  uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path));
  
  return uniqueRoutes.map(route => {
    let name = route.name;
    
    if (name.startsWith('Tab:')) {
      return {
        name,
        path: route.path
      };
    }
    
    const pathParts = route.path.split('/').filter(Boolean);
    if (pathParts.length > 0 && pathParts[pathParts.length - 1] === name.toLowerCase()) {
      name = pathParts.join(' / ');
    }
    
    name = name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return {
      name,
      path: route.path
    };
  });
} 