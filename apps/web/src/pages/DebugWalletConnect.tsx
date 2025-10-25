import React, { useEffect, useState } from 'react';

const DebugWalletConnect = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        console.log('🔍 Starting WalletConnect diagnostics...');
        
        // 1. Check environment variables
        const envCheck = {
          PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
          PROJECT_ID_length: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.length || 0,
          NETWORK: import.meta.env.VITE_HEDERA_NETWORK,
          APP_NAME: import.meta.env.VITE_APP_NAME,
          NODE_ENV: import.meta.env.MODE,
        };

        console.log('Environment variables:', envCheck);

        // 2. Check library imports
        console.log('🔍 Checking library imports...');
        
        let importCheck = {
          DAppConnector: 'unknown',
          LedgerId: 'unknown',
          HederaJsonRpcMethod: 'unknown',
          HederaSessionEvent: 'unknown',
          HederaChainId: 'unknown',
        };

        try {
          const { 
            DAppConnector, 
            LedgerId, 
            HederaJsonRpcMethod, 
            HederaSessionEvent, 
            HederaChainId 
          } = await import('@hashgraph/hedera-wallet-connect');

          importCheck = {
            DAppConnector: typeof DAppConnector,
            LedgerId: typeof LedgerId,
            HederaJsonRpcMethod: typeof HederaJsonRpcMethod,
            HederaSessionEvent: typeof HederaSessionEvent,
            HederaChainId: typeof HederaChainId,
          };

          console.log('Import check:', importCheck);

          // 3. Test enum values
          console.log('🔍 Testing enum values...');
          
          const enumCheck = {};
          
          try {
            enumCheck.LedgerId_TESTNET = LedgerId?.TESTNET?.toString();
            enumCheck.LedgerId_MAINNET = LedgerId?.MAINNET?.toString();
          } catch (e) {
            enumCheck.LedgerId_error = e.message;
          }

          try {
            enumCheck.HederaJsonRpcMethod_values = Object.values(HederaJsonRpcMethod || {}).length;
          } catch (e) {
            enumCheck.HederaJsonRpcMethod_error = e.message;
          }

          try {
            enumCheck.HederaSessionEvent_values = Object.values(HederaSessionEvent || {}).length;
          } catch (e) {
            enumCheck.HederaSessionEvent_error = e.message;
          }

          try {
            enumCheck.HederaChainId_values = Object.values(HederaChainId || {}).length;
          } catch (e) {
            enumCheck.HederaChainId_error = e.message;
          }

          console.log('Enum check:', enumCheck);

          // 4. Test basic constructor
          console.log('🔍 Testing DAppConnector constructor...');
          
          let constructorCheck = {
            canCreate: false,
            error: null,
            constructorType: typeof DAppConnector,
          };

          if (envCheck.PROJECT_ID && envCheck.PROJECT_ID.length >= 32) {
            try {
              const metadata = {
                name: 'Test App',
                description: 'Test Description',
                url: window.location.origin,
                icons: [`${window.location.origin}/favicon.ico`],
              };

              const ledgerId = LedgerId?.TESTNET || 'testnet';
              
              // Test simple constructor without enums first
              const connector = new DAppConnector(
                metadata,
                ledgerId,
                envCheck.PROJECT_ID
              );

              constructorCheck.canCreate = true;
              constructorCheck.hasInit = typeof connector.init === 'function';
              constructorCheck.hasConnect = typeof connector.connect === 'function';
              constructorCheck.hasOpenModal = typeof connector.openModal === 'function';
              
            } catch (e) {
              constructorCheck.error = e.message;
              constructorCheck.stack = e.stack;
            }
          } else {
            constructorCheck.error = 'PROJECT_ID missing or invalid';
          }

          console.log('Constructor check:', constructorCheck);

          setDebugInfo({
            envCheck,
            importCheck,
            enumCheck,
            constructorCheck,
            timestamp: new Date().toISOString(),
          });

        } catch (importError) {
          console.error('Import error:', importError);
          setError({
            type: 'import_error',
            message: importError.message,
            stack: importError.stack,
          });
        }

      } catch (generalError) {
        console.error('General diagnostic error:', generalError);
        setError({
          type: 'general_error',
          message: generalError.message,
          stack: generalError.stack,
        });
      }
    };

    runDiagnostics();
  }, []);

  const testMinimalInit = async () => {
    console.log('🧪 Testing minimal initialization...');
    
    try {
      const { DAppConnector, LedgerId } = await import('@hashgraph/hedera-wallet-connect');
      
      const metadata = {
        name: 'Minimal Test',
        description: 'Minimal test app',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      };

      const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
      
      if (!PROJECT_ID || PROJECT_ID.length < 32) {
        alert('PROJECT_ID is missing or invalid. Please check your .env file.');
        return;
      }

      // Test 1: Most basic constructor
      console.log('Test 1: Basic constructor...');
      const connector1 = new DAppConnector(
        metadata,
        LedgerId.TESTNET,
        PROJECT_ID
      );

      console.log('Test 1 passed - connector created');

      // Test 2: Try init
      console.log('Test 2: Calling init...');
      await connector1.init();
      console.log('Test 2 passed - init completed');

      alert('Minimal initialization test PASSED! The issue might be with enum usage or complex configuration.');

    } catch (error) {
      console.error('Minimal test failed:', error);
      alert(`Minimal test FAILED: ${error.message}`);
    }
  };

  const testWithFallbackConstructor = async () => {
    console.log('🧪 Testing fallback constructor patterns...');
    
    try {
      const { DAppConnector } = await import('@hashgraph/hedera-wallet-connect');
      
      const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
      
      if (!PROJECT_ID) {
        alert('PROJECT_ID missing');
        return;
      }

      const metadata = {
        name: 'Fallback Test',
        description: 'Fallback test app', 
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      };

      const patterns = [
        // Pattern 1: Object-based
        () => new DAppConnector({
          network: 'testnet',
          appMetadata: metadata,
          projectId: PROJECT_ID,
        }),
        
        // Pattern 2: String network
        () => new DAppConnector(
          metadata,
          'testnet',
          PROJECT_ID
        ),
        
        // Pattern 3: Minimal
        () => new DAppConnector(
          metadata,
          'testnet',
          PROJECT_ID,
          [], // methods
          [], // events  
          []  // chains
        ),
      ];

      for (let i = 0; i < patterns.length; i++) {
        try {
          console.log(`Testing pattern ${i + 1}...`);
          const connector = patterns[i]();
          await connector.init();
          console.log(`Pattern ${i + 1} SUCCESS`);
          alert(`Fallback pattern ${i + 1} worked! Use this constructor pattern.`);
          return;
        } catch (e) {
          console.log(`Pattern ${i + 1} failed:`, e.message);
        }
      }

      alert('All fallback patterns failed. There might be a fundamental issue with the library or configuration.');

    } catch (error) {
      console.error('Fallback test error:', error);
      alert(`Fallback test error: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">WalletConnect Debug Console</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error Type:</strong> {error.type}<br />
          <strong>Message:</strong> {error.message}<br />
          {error.stack && (
            <details className="mt-2">
              <summary>Stack Trace</summary>
              <pre className="text-xs mt-1 overflow-x-auto">{error.stack}</pre>
            </details>
          )}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <button
          onClick={testMinimalInit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Minimal Initialization
        </button>
        
        <button
          onClick={testWithFallbackConstructor}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Test Fallback Constructor Patterns
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Environment Variables</h2>
            <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.envCheck, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Import Check</h2>
            <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.importCheck, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Enum Check</h2>
            <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.enumCheck, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-bold mb-2">Constructor Check</h2>
            <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo.constructorCheck, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
        <h3 className="font-bold">Quick Checklist:</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
          <li>Is VITE_WALLETCONNECT_PROJECT_ID set and 32+ characters?</li>
          <li>Is @hashgraph/hedera-wallet-connect installed?</li>
          <li>Are you using the correct import statements?</li>
          <li>Is your PROJECT_ID from cloud.walletconnect.com valid?</li>
          <li>Are there any browser console errors?</li>
        </ul>
      </div>
    </div>
  );
};

export default DebugWalletConnect;