﻿///////////////////////////////////////////////////////////////////////////////
//
// This file was automatically generated by RANOREX.
// DO NOT MODIFY THIS FILE! It is regenerated by the designer.
// All your modifications will be lost!
// http://www.ranorex.com
//
///////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Drawing;
using System.Threading;
using WinForms = System.Windows.Forms;

using Ranorex;
using Ranorex.Core;
using Ranorex.Core.Testing;
using Ranorex.Core.Repository;

namespace ImageValidation
{
#pragma warning disable 0436 //(CS0436) The type 'type' in 'assembly' conflicts with the imported type 'type2' in 'assembly'. Using the type defined in 'assembly'.
    /// <summary>
    ///The Recording1 recording.
    /// </summary>
    [TestModule("bdf443a1-66c9-40d0-8413-8b77a8db4387", ModuleType.Recording, 1)]
    public partial class Recording1 : ITestModule
    {
        /// <summary>
        /// Holds an instance of the ImageValidationRepository repository.
        /// </summary>
        public static ImageValidationRepository repo = ImageValidationRepository.Instance;

        static Recording1 instance = new Recording1();

        /// <summary>
        /// Constructs a new instance.
        /// </summary>
        public Recording1()
        {
        }

        /// <summary>
        /// Gets a static instance of this recording.
        /// </summary>
        public static Recording1 Instance
        {
            get { return instance; }
        }

#region Variables

#endregion

        /// <summary>
        /// Starts the replay of the static recording <see cref="Instance"/>.
        /// </summary>
        [System.CodeDom.Compiler.GeneratedCode("Ranorex", global::Ranorex.Core.Constants.CodeGenVersion)]
        public static void Start()
        {
            TestModuleRunner.Run(Instance);
        }

        /// <summary>
        /// Performs the playback of actions in this recording.
        /// </summary>
        /// <remarks>You should not call this method directly, instead pass the module
        /// instance to the <see cref="TestModuleRunner.Run(ITestModule)"/> method
        /// that will in turn invoke this method.</remarks>
        [System.CodeDom.Compiler.GeneratedCode("Ranorex", global::Ranorex.Core.Constants.CodeGenVersion)]
        void ITestModule.Run()
        {
            Mouse.DefaultMoveTime = 300;
            Keyboard.DefaultKeyPressTime = 100;
            Delay.SpeedFactor = 1.00;

            Init();

            Report.Log(ReportLevel.Info, "Mouse", "Mouse Left Click item 'Explorer.Icon' at 11;14.", repo.Explorer.IconInfo, new RecordItemIndex(0));
            repo.Explorer.Icon.Click("11;14");
            Delay.Milliseconds(200);
            
            Report.Log(ReportLevel.Info, "Invoke action", "Invoking EnsureVisible() on item 'Explorer.Icon'.", repo.Explorer.IconInfo, new RecordItemIndex(1));
            repo.Explorer.Icon.EnsureVisible();
            Delay.Milliseconds(0);
            
            Report.Log(ReportLevel.Info, "Mouse", "Mouse Left Click item 'RxMainFrame.ImageBasedAutomation' at 109;5.", repo.RxMainFrame.ImageBasedAutomationInfo, new RecordItemIndex(2));
            repo.RxMainFrame.ImageBasedAutomation.Click("109;5");
            Delay.Milliseconds(200);
            
            Report.Log(ReportLevel.Info, "Mouse", "Mouse Left Click item 'RxMainFrame.ChkShowImage' at 9;8.", repo.RxMainFrame.ChkShowImageInfo, new RecordItemIndex(3));
            repo.RxMainFrame.ChkShowImage.Click("9;8");
            Delay.Milliseconds(200);
            
            Report.Log(ReportLevel.Info, "Validation", "Validating CompareImage (Screenshot: 'Screenshot1' with region {X=0,Y=0,Width=402,Height=263}) on item 'RxMainFrame.TheCat'.", repo.RxMainFrame.TheCatInfo, new RecordItemIndex(4));
            Validate.CompareImage(repo.RxMainFrame.TheCatInfo, TheCat_Screenshot1, TheCat_Screenshot1_Options);
            Delay.Milliseconds(100);
            
        }

#region Image Feature Data
        /// <summary>
        /// DO NOT REFERENCE THIS CODE  - auto generated
        /// </summary>
        CompressedImage TheCat_Screenshot1
        { get { return repo.RxMainFrame.TheCatInfo.GetScreenshot1(new Rectangle(0, 0, 402, 263)); } }

        /// <summary>
        /// DO NOT REFERENCE THIS CODE  - auto generated
        /// </summary>
        Imaging.FindOptions TheCat_Screenshot1_Options
        { get { return Imaging.FindOptions.Parse("1;None;0,0,402,263;True;10000000;0ms"); } }

#endregion
    }
#pragma warning restore 0436
}
